import { PublicLeadCapture } from '../../../../components/public-lead-capture';

export default async function PublicLeadCapturePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  return <PublicLeadCapture slug={slug} />;
}
