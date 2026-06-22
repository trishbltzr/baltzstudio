import { redirect } from "next/navigation";

export default function Page() {
  redirect("/login?next=%2Fdashboard%3Fview%3Dcocoon%26nav%3Dcocoon");
}
