import { redirect } from "next/navigation";

export default function Page() {
  redirect("/login?next=%2Fdashboard%3Fnav%3Dcocoon");
}
