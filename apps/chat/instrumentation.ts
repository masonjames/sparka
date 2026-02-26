// Instrumentation for Docker/self-hosted deployment
// Vercel OTel and Langfuse-Vercel are not available outside Vercel.
// Add standard OpenTelemetry setup here if needed.

export function register() {
  // No-op for Docker deployment
  // To enable tracing, configure standard OpenTelemetry SDK here
}
