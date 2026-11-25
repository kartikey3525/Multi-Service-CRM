import {
  BadRequestException,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permission } from '@franchise-crm/shared';
import type { Request, Response } from 'express';
import { z } from 'zod';
import type { Actor } from '../../common/actor';
import { Public, RequirePermission } from '../identity/identity.decorator';
import { SessionService } from '../identity/session.service';
import { FilesService, type KycUploadFile } from './files.service';

type RequestWithActor = Request & { actor?: Actor };
const uploadMetadata = z.object({
  ownerType: z.enum(['application', 'partner']),
  ownerId: z.string().regex(/^[a-f\d]{24}$/i),
  docType: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z][a-z0-9_]+$/),
});

@Controller('v1/files/kyc')
export class FilesController {
  constructor(
    @Inject(FilesService) private readonly files: FilesService,
    @Inject(SessionService) private readonly sessions: SessionService,
  ) {}

  @Get('mine')
  @RequirePermission(Permission.identityMe, 'partner')
  listMine(@Req() request: RequestWithActor) {
    if (!request.actor) throw new BadRequestException('Actor identity is missing.');
    return this.files.listMine(request.actor);
  }

  @Post('applications/:applicationId')
  @Public()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  async uploadApplicationDocument(
    @Param('applicationId') applicationId: string,
    @UploadedFile() file: KycUploadFile | undefined,
    @Req() request: Request,
  ) {
    await this.sessions.assertCsrf(request);
    if (!file) throw new BadRequestException('Choose a PDF, JPEG, or PNG file.');
    const body = z
      .object({
        uploadToken: z.string().min(40).max(128),
        docType: uploadMetadata.shape.docType,
      })
      .safeParse(request.body);
    if (!body.success) throw new BadRequestException('KYC document details are invalid.');
    return this.files.uploadApplicationDocument(
      request,
      applicationId,
      body.data.uploadToken,
      body.data.docType,
      file,
    );
  }

  @Post()
  @RequirePermission(Permission.filesUpload)
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024, files: 1 } }))
  upload(@UploadedFile() file: KycUploadFile | undefined, @Req() request: RequestWithActor) {
    if (!request.actor) throw new BadRequestException('Actor identity is missing.');
    if (!file) throw new BadRequestException('Choose a PDF, JPEG, or PNG file.');
    const parsed = uploadMetadata.safeParse(request.body);
    if (!parsed.success) throw new BadRequestException('KYC document details are invalid.');
    return this.files.upload(request.actor, parsed.data, file);
  }

  @Get(':id')
  @RequirePermission(Permission.filesDownload)
  async view(@Param('id') id: string, @Req() request: RequestWithActor, @Res() response: Response) {
    if (!request.actor) throw new BadRequestException('Actor identity is missing.');
    const result = await this.files.retrieve(request, request.actor, id);
    response.set({
      'Content-Type': result.contentType,
      'Content-Length': String(result.sizeBytes),
      'Content-Disposition': 'inline; filename="kyc-document"',
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    response.send(result.bytes);
  }
}
