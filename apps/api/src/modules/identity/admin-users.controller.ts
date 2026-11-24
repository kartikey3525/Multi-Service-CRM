import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { Permission } from '@franchise-crm/shared';
import { z } from 'zod';
import type { Request } from 'express';
import { Types } from 'mongoose';
import { AuditService } from './audit.service';
import { RequirePermission } from './identity.decorator';
import { RoleModel, UserModel, type IdentityKind } from './models';
import { hashPassword } from './security';

const createUserSchema = z.object({
  email: z
    .string()
    .email()
    .max(254)
    .transform((value) => value.trim().toLowerCase()),
  name: z.string().trim().min(1).max(120),
  mobile: z.string().trim().max(24).optional(),
  password: z.string().min(12).max(128),
  kind: z.enum(['admin', 'partner']),
  roleIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .min(1)
    .max(10),
});

const updateUserSchema = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    mobile: z.string().trim().max(24).optional(),
    status: z.enum(['active', 'disabled']).optional(),
  })
  .refine((value) => Object.keys(value).length > 0);

const roleAssignmentSchema = z.object({
  roleIds: z
    .array(z.string().regex(/^[a-f\d]{24}$/i))
    .min(1)
    .max(10),
});

function parse<T>(schema: z.ZodType<T>, input: unknown): T {
  const result = schema.safeParse(input);
  if (!result.success) throw new BadRequestException('Request validation failed.');
  return result.data;
}

function safeUser(user: Record<string, unknown>): Record<string, unknown> {
  const safe = { ...user };
  delete safe.passwordHash;
  delete safe.totpSecretEnc;
  delete safe.recoveryCodeHashes;
  return safe;
}

@Controller('v1/admin')
export class AdminUsersController {
  constructor(@Inject(AuditService) private readonly audit: AuditService) {}

  @Get('roles')
  @RequirePermission(Permission.rolesRead, 'admin')
  async listRoles(@Query('kind') kind?: string) {
    if (kind && kind !== 'admin' && kind !== 'partner')
      throw new BadRequestException('Invalid role type.');
    const roleKind = kind as IdentityKind | undefined;
    const filter = roleKind ? { kind: roleKind } : {};
    return RoleModel.find(filter)
      .select('key name kind permissions system')
      .sort({ key: 1 })
      .lean();
  }

  @Get('users')
  @RequirePermission(Permission.adminUsersRead, 'admin')
  async listUsers(
    @Query('page') pageInput?: string,
    @Query('pageSize') sizeInput?: string,
    @Query('q') query?: string,
  ) {
    const page = Math.max(1, Number.parseInt(pageInput ?? '1', 10) || 1);
    const pageSize = Math.min(100, Math.max(1, Number.parseInt(sizeInput ?? '25', 10) || 25));
    const filter = query
      ? {
          $or: [
            { email: new RegExp(escapeRegex(query), 'i') },
            { name: new RegExp(escapeRegex(query), 'i') },
          ],
        }
      : {};
    const [items, total] = await Promise.all([
      UserModel.find(filter)
        .select(
          'email name mobile kind status roleIds totpEnabled failedLogins lockedUntil lastLoginAt createdAt',
        )
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean(),
      UserModel.countDocuments(filter),
    ]);
    return { items, page, pageSize, total };
  }

  @Post('users')
  @RequirePermission(Permission.adminUsersManage, 'admin')
  async createUser(@Body() body: unknown, @Req() request: Request) {
    const input = parse(createUserSchema, body);
    const roles = await RoleModel.find({
      _id: { $in: input.roleIds.map((id) => new Types.ObjectId(id)) },
      kind: input.kind,
    }).select('_id');
    if (roles.length !== input.roleIds.length)
      throw new BadRequestException('Select roles that match the account type.');
    const user = await UserModel.create({
      email: input.email,
      passwordHash: await hashPassword(input.password),
      name: input.name,
      ...(input.mobile ? { mobile: input.mobile } : {}),
      kind: input.kind as IdentityKind,
      roleIds: roles.map((role) => role._id),
      status: 'active',
      totpEnabled: false,
      failedLogins: 0,
    });
    const result = safeUser(user.toObject() as unknown as Record<string, unknown>);
    await this.audit.record(request, {
      action: 'create',
      entity: 'users',
      entityId: String(user._id),
      after: result,
    });
    return result;
  }

  @Patch('users/:id')
  @RequirePermission(Permission.adminUsersManage, 'admin')
  async updateUser(@Param('id') id: string, @Body() body: unknown, @Req() request: Request) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user ID.');
    const input = parse(updateUserSchema, body);
    const before = await UserModel.findById(id)
      .select(
        'email name mobile kind status roleIds totpEnabled failedLogins lockedUntil lastLoginAt createdAt',
      )
      .lean();
    if (!before) throw new BadRequestException('User not found.');
    const updated = await UserModel.findByIdAndUpdate(
      id,
      { $set: input },
      { new: true, runValidators: true },
    )
      .select(
        'email name mobile kind status roleIds totpEnabled failedLogins lockedUntil lastLoginAt createdAt',
      )
      .lean();
    if (!updated) throw new BadRequestException('User not found.');
    await this.audit.record(request, {
      action: 'update',
      entity: 'users',
      entityId: id,
      before,
      after: updated,
    });
    return updated;
  }

  @Put('users/:id/roles')
  @RequirePermission(Permission.adminUsersManage, 'admin')
  async setRoles(@Param('id') id: string, @Body() body: unknown, @Req() request: Request) {
    if (!Types.ObjectId.isValid(id)) throw new BadRequestException('Invalid user ID.');
    const input = parse(roleAssignmentSchema, body);
    const user = await UserModel.findById(id).select('email name kind roleIds').lean();
    if (!user) throw new BadRequestException('User not found.');
    const roles = await RoleModel.find({
      _id: { $in: input.roleIds.map((roleId) => new Types.ObjectId(roleId)) },
      kind: user.kind,
    }).select('_id');
    if (roles.length !== input.roleIds.length)
      throw new BadRequestException('Select roles that match the account type.');
    const before = { roleIds: user.roleIds };
    const roleIds = roles.map((role) => role._id);
    await UserModel.updateOne({ _id: user._id }, { $set: { roleIds } });
    await this.audit.record(request, {
      action: 'assign_roles',
      entity: 'users',
      entityId: id,
      before,
      after: { roleIds },
    });
    return { userId: id, roleIds };
  }
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').slice(0, 120);
}
