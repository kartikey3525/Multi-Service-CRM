export type IdentityKind = 'admin' | 'partner';

export interface Actor {
  userId: string;
  kind: IdentityKind;
  roleKeys: string[];
  permissions: Set<string>;
  /** Partner IDs in this actor's own subtree, resolved from the Mongo materialized path. */
  partnerPath?: string[];
}

export type MongoScope = Record<string, unknown>;

/** Always constrain partner queries. Until M2 supplies a hierarchy path, partner access fails closed. */
export function scopeToActor(
  actor: Actor,
  filter: MongoScope = {},
  partnerField = 'partnerId',
): MongoScope {
  if (actor.kind === 'admin') return filter;
  const path = actor.partnerPath?.filter(Boolean) ?? [];
  if (!path.length) return { $and: [filter, { [partnerField]: { $in: [] } }] };
  return { $and: [filter, { [partnerField]: { $in: path } }] };
}
