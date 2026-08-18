import { redirect } from "next/navigation";

// No login gate in this deployment — always go straight to the dashboard.
export default function Home() {
  redirect("/dashboard");
}
