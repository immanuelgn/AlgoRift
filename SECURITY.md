# Security

AlgoRift uses Supabase Auth for password handling. The application never stores
or receives plaintext passwords outside the Supabase authentication request.

## Data protection

- The browser uses only the Supabase project URL and browser-safe anon key.
- No `service_role`, secret API key, or database password is shipped to users.
- Row Level Security restricts every profile and progress row to its owner.
- Anonymous visitors cannot read or write account data.
- Database constraints validate usernames, level ranges, and XP ranges.
- Guest progress stays in browser local storage.

## Supabase dashboard checklist

1. Keep email confirmation enabled.
2. Set the production Site URL to `https://algorift.vercel.app`.
3. Add `https://algorift.vercel.app/**` and
   `http://localhost:3000/**` as allowed redirect URLs.
4. Configure custom SMTP before opening account signup to the public. The
   built-in Supabase sender accepts only project-team addresses and is not a
   production email service.
5. Enable CAPTCHA under Authentication attack protection.
6. Review Auth rate limits before launch.
7. Never add a service-role key to Vercel or any `NEXT_PUBLIC_*` variable.

Run [supabase/algorift_setup.sql](supabase/algorift_setup.sql) in the Supabase
SQL Editor before enabling cloud accounts.

## Reporting

Please report security issues privately to the repository owner rather than
opening a public issue with exploit details.
