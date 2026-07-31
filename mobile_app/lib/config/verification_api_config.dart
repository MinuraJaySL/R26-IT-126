/// Base URL of the deployed Cloudflare Worker that handles email
/// verification for sign-up (see mobile_app/cf-worker). Update this after
/// running `wrangler deploy` — the CLI prints the live URL, typically
/// something like https://greensweep-verification-worker.YOUR-SUBDOMAIN.workers.dev
class VerificationApiConfig {
  static const String baseUrl =
      'https://greensweep-verification-worker.example.workers.dev';
}
