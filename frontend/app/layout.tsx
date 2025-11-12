import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wander Deploy Dashboard",
  description: "Zero-to-running deployment tracking and service monitoring",
};

const RootLayout = ({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) => {
  return (
    <html lang="en">
      <body className="bg-background text-foreground antialiased">
        <div className="min-h-screen flex flex-col">
          {/* Header Navigation */}
          <header className="border-b border-border bg-card">
            <div className="container mx-auto px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">W</span>
                  </div>
                  <h1 className="text-xl font-semibold">Wander Deploy Dashboard</h1>
                </div>
                <div className="text-sm text-muted-foreground">
                  Zero-to-Running Demo
                </div>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1">
            {children}
          </main>

          {/* Footer */}
          <footer className="border-t border-border py-4 mt-auto">
            <div className="container mx-auto px-6">
              <p className="text-center text-sm text-muted-foreground">
                Wander Zero-to-Running • Kubernetes + Docker + Next.js + Hono
              </p>
            </div>
      </footer>
    </div>
    </body>
  </html>
  );
};

export default RootLayout;
