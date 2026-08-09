export default function TemplatePreviewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Intentionally bare layout — no sidebar, no nav shell.
  // The preview page renders its own sticky top bar.
  return <>{children}</>;
}
