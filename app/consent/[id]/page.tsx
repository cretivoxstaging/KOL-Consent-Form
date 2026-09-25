import TalentConsentForm from "@/components/TalentConsentForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ConsentTemplatePage({ params }: PageProps) {
  const { id } = await params;
  return <TalentConsentForm templateId={id} />;
}
