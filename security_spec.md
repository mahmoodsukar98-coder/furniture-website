# Security Specification

## Data Invariants
1. A furniture set can only be created by the verified administrator.
2. The furniture set must contain exactly the specified schema (name, price, description, images, videos, createdAt) with no additional fields.
3. The catalog is public, but writes are locked to `mahmoodsukar98@gmail.com`.

## The "Dirty Dozen" Payloads
1. Shadow Field: `{name: "A", price: "1", description: [], images: [], videos: [], createdAt: 1, extraList: []}` -> Fails hasAll/size constraint.
2. Missing Field: `{name: "A", price: "1"}` -> Fails hasAll.
3. Spoofed Admin Email (Unverified): request.auth.token.email_verified == false -> Fails isAdmin().
4. Spoofed Admin Email (Different user): request.auth.token.email == "attacker@gmail.com" -> Fails isAdmin().
5. Invalid Type (Price as number): `price: 100` -> Fails `data.price is string`.
6. Array Oversize (description > 50 items) -> Fails `data.description.size() <= 50`.
7. Invalid ID (Poisoning): `setId` contains special chars `!@#` -> Fails `isValidId`.
8. Updating Immutable Field: Modifying `createdAt` during update -> Fails `affectedKeys().hasOnly(...)`.
9. PII Extraction: N/A, dataset is public.
10. Anonymous Write: request.auth == null -> Fails `isSignedIn()`.
11. Size Limit Bypass: `name` is 500 characters -> Fails `data.name.size() <= 200`.
12. Denial of Wallet: Trying to query all without constraints -> We actually `allow list: if true`, which is intended for the public catalog interface.
