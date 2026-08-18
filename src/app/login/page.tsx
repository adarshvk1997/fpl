import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 bg-neutral-950 px-4">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-semibold text-white">FPL AI Advisor</h1>
        <p className="max-w-sm text-sm text-neutral-400">
          Your personal Fantasy Premier League pundit. Sign in with a magic link — no password.
        </p>
      </div>
      <LoginForm />
    </main>
  );
}
