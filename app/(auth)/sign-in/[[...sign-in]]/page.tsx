import { SignIn } from "@clerk/nextjs";
import { clerkAppearance } from "@/lib/clerk-appearance";
import { isClerkEnabled } from "@/lib/clerk-config";
import { redirect } from "next/navigation";

export default function SignInPage() {
  if (!isClerkEnabled()) {
    redirect("/login");
  }

  return (
    <div className="auth-layout">
      <main className="auth-main" style={{ width: "100%" }}>
        <div className="auth-form-wrap">
          <SignIn appearance={clerkAppearance} routing="path" path="/sign-in" />
        </div>
      </main>
    </div>
  );
}
