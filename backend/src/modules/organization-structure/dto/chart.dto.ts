export type OrgChartScope = 'self' | 'team' | 'org';

export class GetOrgChartQueryDto {
  scope?: OrgChartScope;
  rootPositionId?: string; // admins only
  maxDepth?: number;
}