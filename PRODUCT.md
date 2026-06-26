# Product

## Register

product

## Users

Five distinct roles on one platform, "Washly" — a multi-tenant car wash booking + operations network (full blueprint: `washly_blueprint_v2.pdf`, June 2026):

- **Customer**: books wash appointments by phone+OTP, picks a wash location (map + list), picks services (Talabat-style menu), picks a time slot and an employee, manages vehicles, rates completed visits, uses coupons/subscriptions/referrals. Mobile-first, casual context, Arabic-first (RTL).
- **Employee**: works one wash location, sees only their own shift/bookings and only the services they're specialized in, checks customers in via an arrival code, marks jobs in-progress/done/no-show, reports issues, requests leave. No financial data, no other employees' bookings.
- **Supervisor** ("كبير الموظفين"): runs day-to-day floor operations at one wash location — real-time cell/timeline dashboard, assigns/reassigns staff (drag & drop), quick-adds walk-in bookings, manages resources, escalates closures/complaints to the owner. No financial data, no customer details beyond name, no wash settings.
- **Owner**: runs one wash location as a business — dashboard (revenue, peak hours), scheduling, staff management & performance/bonus, leave approval, service/pricing/capacity settings, loyalty & subscription config, reports, platform invoice (commission transparency). New services and duration changes need super-admin approval; pricing changes are free but notified.
- **Super Admin** (Yusuf, platform owner): runs the whole network — all washes' health, commission %, billing/collections, contracts, dispute resolution, churn monitoring, suspicious-booking detection, B2B signup portal, impersonation ("login as wash") with mandatory notification to the owner. Sees private platform-wide revenue no one else can access. Every action is double-confirmed + password-gated + audit-logged; nothing is ever hard-deleted, only archived.

## Product Purpose

Washly is a commission-based marketplace connecting customers to car wash businesses, plus the full operations stack each wash runs on. The business model: Yusuf (super admin) takes an agreed % of every completed visit per wash, with a separate monthly minimum per wash (invoice = max(visits × price × %, minimum)), settled automatically via Instapay; customers pay the wash in cash directly — Yusuf never touches customer payment. A visit only counts toward commission once the customer's arrival code is entered by an employee (fraud-proofing: no code, no check-in, no fake/hidden visits). Success looks like frictionless booking for customers, clear floor control for staff, trustworthy commission accounting for owners, and full network visibility/control for the super admin.

## Build Order

The blueprint's stated build order — Database schema (5 roles + relations) → Auth/roles (JWT + OTP) → Customer pages → Employee pages → Supervisor pages → Owner pages → Super Admin pages → Backend hardening → Full testing → Deploy (Vercel + Railway). Frontend stack per the blueprint: Next.js + TypeScript + Tailwind (the live codebase is on Next.js 16 / React 19, ahead of the blueprint's Next 14 reference — keep the newer stack, the version number in the PDF isn't load-bearing). Backend is FastAPI + PostgreSQL + Redis, already scaffolded (`backend/`) with basic user/wash/booking/vehicle/leave/waitlist models and routers — treated as reference/foundation, not to be rewritten casually.

## Brand Personality

Premium, sleek, modern. The current implementation (dark near-black background, steel-blue accent, minimal motion) was explicitly called out by the owner as feeling "poor" / underbuilt — the direction going forward should feel notably stronger: richer animation, more imagery, more considered shapes and depth, while staying premium rather than loud.

## Anti-references

No specific named anti-references given. Avoid the current state's flatness: sparse motion, no imagery, plain card-and-glow treatment repeated everywhere. Avoid generic SaaS-dashboard tropes (hero-metric cards, identical card grids) — this is a real operations tool with two very different audiences (customers vs. staff) and should look the part for each.

## Design Principles

- **Five faces, one identity**: customer booking, employee shift view, supervisor floor control, owner business dashboard, and super-admin network console serve very different jobs (persuasion/ease vs. density/control vs. network oversight) but must read as the same premium brand.
- **Premium through craft, not noise**: richer animation and imagery should feel intentional and high-end, not decorative for its own sake — motion and visuals should reinforce trust and confidence in the service.
- **Bilingual by default**: every surface should work in Arabic and English; RTL is the default reading direction (existing layout already ships `dir="rtl"`), not an afterthought.
- **Clarity under operational pressure**: supervisor/employee screens are used in real-time on a wash floor — legibility, large touch targets, and unambiguous state (color-coded cells, clear check-in/done/no-show buttons) win over visual richness there.
- **Permission boundaries are visual, not just logical**: a role that can't see money or other people's data shouldn't just have it hidden — the UI for that role should never imply those numbers exist (no blank "revenue" cards for supervisors/employees, no greyed-out admin-only nav items half-shown to lower roles).
- **Trust through transparency where it's owed**: owners need to see the commission math plainly (visits × price × % vs. minimum); customers need the arrival-code mechanic to feel like protection, not friction.

## Accessibility & Inclusion

Arabic and English support (RTL-aware layout where Arabic is used). Standard WCAG-friendly contrast and readability; no additional accommodations specified beyond that.
