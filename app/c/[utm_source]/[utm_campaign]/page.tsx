import { redirect } from "next/navigation";

interface PageProps {
  params: Promise<{
    utm_source: string;
    utm_campaign: string;
  }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function SlugTrackingPage(props: PageProps) {
  const { utm_source, utm_campaign } = await props.params;
  const search = await props.searchParams;

  const urlParams = new URLSearchParams();

  // Preservar quaisquer outros parâmetros já existentes na query string
  for (const [key, val] of Object.entries(search)) {
    if (typeof val === "string") {
      urlParams.set(key, val);
    } else if (Array.isArray(val) && val[0]) {
      urlParams.set(key, val[0]);
    }
  }

  // Define os UTMs vindos da rota amigável /c/[utm_source]/[utm_campaign]
  if (utm_source) {
    urlParams.set("utm_source", decodeURIComponent(utm_source));
  }
  if (utm_campaign) {
    urlParams.set("utm_campaign", decodeURIComponent(utm_campaign));
  }

  // Redireciona internamente para a raiz preservando todos os parâmetros
  redirect(`/?${urlParams.toString()}`);
}
