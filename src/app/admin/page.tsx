import { redirect } from "next/navigation";
import { ADMIN_HOME } from "@/lib/paths";

export default function AdminRootRedirectPage() {
  // /admin 에 접속하면 항상 실제 홈으로 보냅니다.
  redirect(ADMIN_HOME);
}
