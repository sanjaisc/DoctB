# Graph Report - .  (2026-07-06)

## Corpus Check
- Large corpus: 324 files · ~864,803 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 1260 nodes · 2432 edges · 103 communities (58 shown, 45 thin omitted)
- Extraction: 97% EXTRACTED · 3% INFERRED · 0% AMBIGUOUS · INFERRED: 61 edges (avg confidence: 0.88)
- Token cost: 11,372 input · 8,437 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Dependencies & Packages|Dependencies & Packages]]
- [[_COMMUNITY_Core Architecture & Design|Core Architecture & Design]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_Staff Dashboard Layout|Staff Dashboard Layout]]
- [[_COMMUNITY_Loading States|Loading States]]
- [[_COMMUNITY_API CRUD Routes|API CRUD Routes]]
- [[_COMMUNITY_Navigation UI Components|Navigation UI Components]]
- [[_COMMUNITY_Form & Sheet Components|Form & Sheet Components]]
- [[_COMMUNITY_Admin API Routes|Admin API Routes]]
- [[_COMMUNITY_Booking API Routes|Booking API Routes]]
- [[_COMMUNITY_WebSocket & Error Pages|WebSocket & Error Pages]]
- [[_COMMUNITY_Payments & Reviews|Payments & Reviews]]
- [[_COMMUNITY_Appointment Review UI|Appointment Review UI]]
- [[_COMMUNITY_Provider Search API|Provider Search API]]
- [[_COMMUNITY_Dev Tools & Config|Dev Tools & Config]]
- [[_COMMUNITY_Charts & Visualization|Charts & Visualization]]
- [[_COMMUNITY_Slot Lock System|Slot Lock System]]
- [[_COMMUNITY_Dialog UI Components|Dialog UI Components]]
- [[_COMMUNITY_Clinics Directory|Clinics Directory]]
- [[_COMMUNITY_TypeScript Configuration|TypeScript Configuration]]
- [[_COMMUNITY_Hover & Progress UI|Hover & Progress UI]]
- [[_COMMUNITY_Component Aliases|Component Aliases]]
- [[_COMMUNITY_Patient Booking Page|Patient Booking Page]]
- [[_COMMUNITY_Admin Management Panel|Admin Management Panel]]
- [[_COMMUNITY_Theme & Dropdown Menu|Theme & Dropdown Menu]]
- [[_COMMUNITY_Data Models & Security|Data Models & Security]]
- [[_COMMUNITY_Booking Confirmation|Booking Confirmation]]
- [[_COMMUNITY_Activity Notification Feed|Activity Notification Feed]]
- [[_COMMUNITY_Staff Appointment Views|Staff Appointment Views]]
- [[_COMMUNITY_Menu Bar Components|Menu Bar Components]]
- [[_COMMUNITY_Context Menu Components|Context Menu Components]]
- [[_COMMUNITY_About & Insurance Pages|About & Insurance Pages]]
- [[_COMMUNITY_Home & Search Page|Home & Search Page]]
- [[_COMMUNITY_QA Screenshots S1-3|QA Screenshots S1-3]]
- [[_COMMUNITY_Carousel Components|Carousel Components]]
- [[_COMMUNITY_Memory Cache Utility|Memory Cache Utility]]
- [[_COMMUNITY_Public API Endpoints|Public API Endpoints]]
- [[_COMMUNITY_Clinic Detail Page|Clinic Detail Page]]
- [[_COMMUNITY_Analytics Dashboard|Analytics Dashboard]]
- [[_COMMUNITY_Manual Booking Page|Manual Booking Page]]
- [[_COMMUNITY_Seed & Slot Generation|Seed & Slot Generation]]
- [[_COMMUNITY_Patient Intake Form|Patient Intake Form]]
- [[_COMMUNITY_Provider Profile Page|Provider Profile Page]]
- [[_COMMUNITY_Auth Middleware & Roles|Auth Middleware & Roles]]
- [[_COMMUNITY_Drawer Components|Drawer Components]]
- [[_COMMUNITY_New Booking Flow QA|New Booking Flow QA]]
- [[_COMMUNITY_Staff Dashboard QA|Staff Dashboard QA]]
- [[_COMMUNITY_WebSocket Server|WebSocket Server]]
- [[_COMMUNITY_Dev Scripts|Dev Scripts]]
- [[_COMMUNITY_Auth Types & Session|Auth Types & Session]]
- [[_COMMUNITY_Staff UI Flow Concepts|Staff UI Flow Concepts]]
- [[_COMMUNITY_Patient Booking Flow QA|Patient Booking Flow QA]]
- [[_COMMUNITY_Alert Components|Alert Components]]
- [[_COMMUNITY_Staff Booking API|Staff Booking API]]
- [[_COMMUNITY_ESLint Config|ESLint Config]]
- [[_COMMUNITY_Mini Services Scripts|Mini Services Scripts]]
- [[_COMMUNITY_Geocoding API|Geocoding API]]
- [[_COMMUNITY_Patient Name Masking|Patient Name Masking]]
- [[_COMMUNITY_Clinics Layout|Clinics Layout]]
- [[_COMMUNITY_Intake Layout|Intake Layout]]
- [[_COMMUNITY_Review Layout|Review Layout]]
- [[_COMMUNITY_Build Scripts|Build Scripts]]
- [[_COMMUNITY_Mini Services Build|Mini Services Build]]
- [[_COMMUNITY_Mini Services Install|Mini Services Install]]
- [[_COMMUNITY_Start Script|Start Script]]
- [[_COMMUNITY_Intake API|Intake API]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]
- [[_COMMUNITY_Community 83|Community 83]]
- [[_COMMUNITY_Community 84|Community 84]]
- [[_COMMUNITY_Community 85|Community 85]]
- [[_COMMUNITY_Community 86|Community 86]]
- [[_COMMUNITY_Community 87|Community 87]]
- [[_COMMUNITY_Community 88|Community 88]]
- [[_COMMUNITY_Community 89|Community 89]]
- [[_COMMUNITY_Community 90|Community 90]]
- [[_COMMUNITY_Community 91|Community 91]]
- [[_COMMUNITY_Community 92|Community 92]]
- [[_COMMUNITY_Community 93|Community 93]]
- [[_COMMUNITY_Community 94|Community 94]]
- [[_COMMUNITY_Community 95|Community 95]]
- [[_COMMUNITY_Community 96|Community 96]]
- [[_COMMUNITY_Community 97|Community 97]]
- [[_COMMUNITY_Community 98|Community 98]]
- [[_COMMUNITY_Community 99|Community 99]]
- [[_COMMUNITY_Community 100|Community 100]]
- [[_COMMUNITY_Community 101|Community 101]]
- [[_COMMUNITY_Community 102|Community 102]]

## God Nodes (most connected - your core abstractions)
1. `cn()` - 234 edges
2. `Button()` - 36 edges
3. `Skeleton()` - 26 edges
4. `Badge()` - 25 edges
5. `Card()` - 25 edges
6. `CardContent()` - 25 edges
7. `createAuditLog()` - 22 edges
8. `authOptions` - 18 edges
9. `Appointment — anonymous patient booking records` - 18 edges
10. `react` - 17 edges

## Surprising Connections (you probably didn't know these)
- `Appointment State Machine Transitions` --references--> `Appointment — anonymous patient booking records`  [INFERRED]
  src/lib/enums.ts → tool-results/read_1783182737556_c4d5e5d54a7d.txt
- `Waitlist System` --semantically_similar_to--> `Waitlist Engine`  [INFERRED] [semantically similar]
  README.md → upload/Clinic-Directory-Booking-NEXTJS.md
- `Token — cryptographically hashed patient self-service tokens` --implements--> `Secure Patient Token Authentication`  [EXTRACTED]
  tool-results/read_1783182737556_c4d5e5d54a7d.txt → src/lib/crypto.ts
- `User — staff accounts (SYSTEM_MANAGER/CLINIC_ADMIN/CLINIC_RECEPTION)` --implements--> `Role-Based Access Control with Hierarchy`  [INFERRED]
  tool-results/read_1783182737556_c4d5e5d54a7d.txt → src/lib/auth.ts
- `Staff Calendar — time-grid view, date picker, provider filter, slot status colors, current time indicator` --displays--> `Slot — time-slot inventory stored in UTC`  [INFERRED]
  worklog.md → tool-results/read_1783182737556_c4d5e5d54a7d.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Development Sprints 1-4** — worklog_sprint_1, worklog_sprint_2, worklog_sprint_3, worklog_sprint_4 [EXTRACTED 1.00]
- **Architecture Adaptations (SQLite, Cache, NextAuth)** — readme_sqlite, readme_in_memory_caching, readme_nextauth_v4 [EXTRACTED 1.00]
- **Booking pipeline — lock, create appointment, return token** — prisma_model_slot, prisma_model_slotlock, prisma_model_appointment, prisma_model_token [EXTRACTED 1.00]
- **Concurrent booking protection — DB-level unique constraint on SlotLock.slotId prevents double-booking** — prisma_model_slot, prisma_model_slotlock, design_pattern_twophase_locking [EXTRACTED 1.00]
- **Full Booking Pipeline (Slot → Lock → Appointment → Token → Review)** — prisma_model_slot, prisma_model_slotlock, prisma_model_appointment, prisma_model_token, prisma_model_review, prisma_model_appointmentledger [EXTRACTED 1.00]
- **Staff Authentication Pipeline (User → NextAuth → JWT → Role Enforcement)** — prisma_model_user, src_lib_auth_ts, src_lib_enums_ts, src_lib_crypto_ts, role_based_access_control, src_lib_enums_has_minimum_role [EXTRACTED 1.00]
- **Booking pipeline — lock, create appointment, create ledger, generate token, audit** — prisma_model_slot, prisma_model_slotlock, prisma_model_appointment, prisma_model_appointmentledger, prisma_model_token, prisma_model_auditlog [EXTRACTED 1.00]
- **Staff Portal — role-based dashboard, calendar, manual booking, appointments, slots, analytics** — concept_role_hierarchy, frontend_staff_dashboard, frontend_staff_calendar, frontend_manual_booking, frontend_staff_appointments, frontend_slot_management, frontend_analytics_page [EXTRACTED 1.00]
- **Patient journey — search → book → token → manage/check-in → review** — frontend_search_page_ui, frontend_booking_wizard, prisma_model_token, frontend_patient_portal, prisma_model_review [INFERRED 0.85]
- **Core Data Models** — model_clinic, model_provider, model_appointment, model_slot, model_token, model_user, model_slotlock, model_insurance, model_specialty, model_service, model_auditlog, model_review, model_internalnote, model_appointmentledger, model_slottemplate, model_systemconfig [EXTRACTED 1.00]
- **Patient Booking Pipeline** — component_searchpage, component_bookingpage, component_intakeformpage, component_managepage, api_search_providers, api_appointments, api_intake, api_manage, api_taxonomies [EXTRACTED 1.00]
- **Staff Portal** — component_appointmentspage, api_staff_appointments, api_staff_book, model_user, model_auditlog, model_internalnote, concept_role_hierarchy, worklog_sprint4 [EXTRACTED 1.00]
- **AppointmentManagementUI** — src_app_staff_dashboard_appointments_page_page_tsx_appointmentspage, src_app_staff_dashboard_appointments_page_page_tsx_appointmentrow, src_app_staff_dashboard_appointments_page_page_tsx_appointmentdetail, src_app_staff_dashboard_appointments_page_page_tsx_waitlistrow, src_app_staff_dashboard_appointments_page_page_tsx_noteitem, src_app_staff_dashboard_appointments_page_page_tsx_modalitybadge, src_app_staff_dashboard_appointments_page_page_tsx_statusbadge [EXTRACTED 0.75]
- **Sprint 1 QA screenshots (before state + verification)** — qa_sprint1_before_png_qa_sprint1_before, sprint1_verify_png_sprint1_verify, sprint_1 [INFERRED 0.75]
- **Sprint 2 QA screenshots (search, hero, results, final)** — qa_sprint2_search_png_qa_sprint2_search, qa_sprint2_hero_png_qa_sprint2_hero, qa_sprint2_results_png_qa_sprint2_results, qa_sprint2_final_png_qa_sprint2_final, sprint_2 [INFERRED 0.75]
- **Sprint 3 QA screenshots (booking step 1, clinic detail, derm listing)** — qa_sprint3_book_step1_png_qa_sprint3_book_step1, qa_sprint3_clinic_png_qa_sprint3_clinic, qa_sprint3_derm_png_qa_sprint3_derm, sprint_3 [INFERRED 0.75]
- **Patient booking flow: Home search → Clinic detail → Booking step 1 → Booking step 2 → Guardian consent** — download_qa_home_home_page, download_qa_clinic_detail_clinic_detail, download_qa_booking_page_booking_step1, download_qa_booking_step2_booking_step2, download_qa_booking_guardian_check_guardian_consent [INFERRED 0.85]
- **Staff dashboard navigation: Dashboard (loading) → Dashboard (loaded) → Dashboard detail / Calendar / Appointments** — download_qa_dashboard_dashboard_loading, download_qa_dashboard_loaded_dashboard_loaded, download_qa_dashboard_detail_dashboard_detail, download_qa_calendar_calendar_view, download_qa_appointments_appointments_list [INFERRED 0.75]
- **Public browsing: Home search → Clinic detail → Book appointment** — download_qa_home_home_page, download_qa_clinic_detail_clinic_detail, download_qa_booking_page_booking_step1 [INFERRED 0.85]
- **New Booking Flow (Screenshots)** — download_qa_login_login_screen, download_qa_new_home_home_screen, download_qa_new_booking_booking_form, download_qa_new_clinic_clinic_selection, download_qa_new_results_search_results, download_qa_new_confirmation_confirmation_screen [INFERRED 0.85]
- **Manual Booking Flow (Screenshots)** — download_qa_manual_booking_manual_booking_step1, download_qa_manual_booking_step2_manual_booking_step2 [INFERRED 0.85]
- **S5 Booking Flow (Screenshots)** — download_qa_s5_calendar_calendar_view, download_qa_s5_booking_step1_booking_step1 [INFERRED 0.85]
- **he_staff_dashboard_overview** — download_qa_staff_dashboard_png_staff_dashboard_page, download_qa_staff_dashboard_png_sidebar_nav, download_qa_staff_dashboard_png_top_header, download_qa_staff_dashboard_png_stat_cards, download_qa_staff_dashboard_png_today_schedule, download_qa_staff_dashboard_png_quick_actions, download_qa_staff_dashboard_png_performance_card, download_qa_staff_dashboard_png_recent_activity [EXTRACTED]
- **he_staff_dashboard_clinic_ops_workflow** — download_qa_staff_dashboard_png_staff_portal, download_qa_staff_dashboard_png_manual_booking_flow, download_qa_staff_dashboard_png_recent_activity, download_qa_staff_dashboard_png_performance_card [INFERRED_0.85]
- **he_staff_dashboard_role_based_access** — download_qa_staff_dashboard_png_sidebar_nav, download_qa_staff_dashboard_png_staff_portal [INFERRED_0.75]
- **** — upload_DoctA-Logo-PNG_logo_image, upload_DoctA-Logo-PNG_project_entity [0.85]

## Communities (103 total, 45 thin omitted)

### Community 0 - "Dependencies & Packages"
Cohesion: 0.03
Nodes (66): dependencies, bcryptjs, class-variance-authority, clsx, cmdk, date-fns, @dnd-kit/core, @dnd-kit/sortable (+58 more)

### Community 1 - "Core Architecture & Design"
Cohesion: 0.06
Nodes (58): Anonymous Patient Booking Flow, Haversine Distance Search — bounding box pre-filter + precise Haversine, tie-breaking sort, In-Memory Cache — Map-based with TTL, prefix/tag deletion, getOrSet factory, JWT Auth — NextAuth v4, JWT strategy, 30-day expiry, credentials provider, Role Hierarchy — SYSTEM_MANAGER > CLINIC_ADMIN > CLINIC_RECEPTION via hasMinimumRole(), Two-Phase Booking Lock — DB unique constraint on SlotLock.slotId prevents double-booking, Anonymous patient flow — no User accounts; patient data stored directly on Appointment, Secure token hashing — crypto.randomBytes(32) hashed with scrypt before storage; raw token never persisted (+50 more)

### Community 2 - "Root Layout & Fonts"
Cohesion: 0.06
Nodes (41): sonner, geistMono, geistSans, metadata, StaffLoginPage(), Providers(), FormControl(), FormDescription() (+33 more)

### Community 3 - "Staff Dashboard Layout"
Cohesion: 0.06
Nodes (37): getInitials(), getRoleBadgeColor(), getRoleLabel(), NAV_ITEMS, StaffDashboardLayout(), ProviderOption, SLOT_STATUS_LABELS, SLOT_STATUS_STYLES (+29 more)

### Community 4 - "Loading States"
Cohesion: 0.06
Nodes (20): AppointmentInfo, CalendarData, CalendarPage(), formatTime12(), getMinuteOffset(), ProviderInfo, providerLabel(), SlotCard() (+12 more)

### Community 5 - "API CRUD Routes"
Cohesion: 0.06
Nodes (39): PATCH(), PatchBody, GET(), GET(), APPOINTMENT_STATUS, APPOINTMENT_STATUSES, APPOINTMENT_TRANSITIONS, AppointmentStatus (+31 more)

### Community 6 - "Navigation UI Components"
Cohesion: 0.09
Nodes (31): AccordionContent(), AccordionItem(), AccordionTrigger(), BreadcrumbEllipsis(), BreadcrumbItem(), BreadcrumbLink(), BreadcrumbList(), BreadcrumbPage() (+23 more)

### Community 7 - "Form & Sheet Components"
Cohesion: 0.07
Nodes (33): Input(), Sheet(), SheetContent(), SheetDescription(), SheetFooter(), SheetHeader(), SheetOverlay(), SheetTitle() (+25 more)

### Community 8 - "Admin API Routes"
Cohesion: 0.08
Nodes (16): handler, GET(), buildAdminData(), GET(), buildAnalytics(), GET(), GET(), NOTIFICATION_ACTIONS (+8 more)

### Community 9 - "Booking API Routes"
Cohesion: 0.11
Nodes (24): POST(), PublicBookingBody, PublicBookingError, GET(), POST(), GET(), POST(), SubmitReviewBody (+16 more)

### Community 10 - "WebSocket & Error Pages"
Cohesion: 0.13
Nodes (16): Message, User, ACTIVITY_ICON_MAP, ActivityNotification, DashboardData, DashboardStats, getActivityDescription(), RecentActivitySection() (+8 more)

### Community 11 - "Payments & Reviews"
Cohesion: 0.08
Nodes (32): Patient Review System, Deposit Capture, Stripe Integration Guide, PaymentIntent, Webhook Handler, Anonymous Patient Tokens, Audit Trail, Bun (+24 more)

### Community 12 - "Appointment Review UI"
Cohesion: 0.10
Nodes (16): AppointmentData, checkCirclePathVariants, checkmarkVariants, fadeInUp, PageState, RATING_LABELS, ClinicInfo, ClinicProviderRow() (+8 more)

### Community 13 - "Provider Search API"
Cohesion: 0.14
Nodes (20): executeSearch(), GET(), hashParams(), ProviderClinic, ProviderResult, ProviderSlot, SearchParams, SearchResponse (+12 more)

### Community 14 - "Dev Tools & Config"
Cohesion: 0.08
Nodes (24): devDependencies, bun-types, eslint, eslint-config-next, tailwindcss, @tailwindcss/postcss, tw-animate-css, @types/bcryptjs (+16 more)

### Community 15 - "Charts & Visualization"
Cohesion: 0.10
Nodes (19): input-otp, react, ChartConfig, ChartContainer(), ChartContext, ChartContextProps, ChartLegendContent(), ChartTooltipContent() (+11 more)

### Community 16 - "Slot Lock System"
Cohesion: 0.17
Nodes (18): POST(), POST(), DELETE(), LockRequestBody, POST(), POST(), RescheduleBody, PATCH() (+10 more)

### Community 17 - "Dialog UI Components"
Cohesion: 0.10
Nodes (18): AlertDialogAction(), AlertDialogCancel(), AlertDialogContent(), AlertDialogDescription(), AlertDialogFooter(), AlertDialogHeader(), AlertDialogOverlay(), AlertDialogTitle() (+10 more)

### Community 18 - "Clinics Directory"
Cohesion: 0.12
Nodes (17): ClinicData, ProviderBrief, TaxonomySpecialty, AvailabilityData, DayColumn, ProviderAvailabilityCalendarProps, Service, Slot (+9 more)

### Community 19 - "TypeScript Configuration"
Cohesion: 0.10
Nodes (20): compilerOptions, allowJs, esModuleInterop, incremental, isolatedModules, jsx, lib, module (+12 more)

### Community 20 - "Hover & Progress UI"
Cohesion: 0.13
Nodes (9): HoverCardContent(), Progress(), ResizableHandle(), ResizablePanelGroup(), Switch(), ToggleGroupContext, ToggleGroupItem(), Toggle() (+1 more)

### Community 21 - "Component Aliases"
Cohesion: 0.11
Nodes (17): aliases, components, hooks, lib, ui, utils, iconLibrary, rsc (+9 more)

### Community 22 - "Patient Booking Page"
Cohesion: 0.16
Nodes (13): BookingPage(), formatCents(), formatSlotDate(), formatSlotTime(), formatSlotTimeOnly(), getTodayDateString(), Insurance, maskName() (+5 more)

### Community 23 - "Admin Management Panel"
Cohesion: 0.15
Nodes (13): AdminData, AuditEntry, ClinicRow, formatRelativeTime(), getActionBorderColor(), getActionDescription(), getActionIcon(), getRoleBadgeClasses() (+5 more)

### Community 24 - "Theme & Dropdown Menu"
Cohesion: 0.14
Nodes (12): ThemeToggle(), DropdownMenu(), DropdownMenuCheckboxItem(), DropdownMenuContent(), DropdownMenuItem(), DropdownMenuLabel(), DropdownMenuRadioItem(), DropdownMenuSeparator() (+4 more)

### Community 25 - "Data Models & Security"
Cohesion: 0.12
Nodes (17): ProviderProfilePage, bcrypt Password Hashing, SHA-256 Token Hashing, Two-Phase Booking Lock, Appointment, Clinic, InternalNote, Provider (+9 more)

### Community 26 - "Booking Confirmation"
Cohesion: 0.14
Nodes (12): checkCirclePathVariants, checkmarkVariants, fadeInUp, formatCents(), ManageData, ManagePage(), PageState, staggerContainer (+4 more)

### Community 27 - "Activity Notification Feed"
Cohesion: 0.15
Nodes (12): ACTION_CONFIG, ActivityNotification, FILTER_MAP, FilterTab, getActionConfig(), getActivityDescription(), NotificationCard(), NotificationsResponse (+4 more)

### Community 28 - "Staff Appointment Views"
Cohesion: 0.16
Nodes (16): AppointmentDetail, AppointmentRow, AppointmentsPage(), NoteItem, AppointmentsPage, ModalityBadge, ProviderOption, StatusBadge (+8 more)

### Community 29 - "Menu Bar Components"
Cohesion: 0.12
Nodes (11): Menubar(), MenubarCheckboxItem(), MenubarContent(), MenubarItem(), MenubarLabel(), MenubarRadioItem(), MenubarSeparator(), MenubarShortcut() (+3 more)

### Community 30 - "Context Menu Components"
Cohesion: 0.12
Nodes (9): ContextMenuCheckboxItem(), ContextMenuContent(), ContextMenuItem(), ContextMenuLabel(), ContextMenuRadioItem(), ContextMenuSeparator(), ContextMenuShortcut(), ContextMenuSubContent() (+1 more)

### Community 31 - "About & Insurance Pages"
Cohesion: 0.23
Nodes (8): STATS, VALUES, FAQ_ITEMS, InsuranceItem, DoctALogo(), PublicFooter(), PublicNavbar(), PublicNavbarProps

### Community 32 - "Home & Search Page"
Cohesion: 0.16
Nodes (12): buildFetchUrl(), FeaturedClinic, getSpecialtyIcon(), PopularSpecialty, ProviderResult, ProviderSlot, SearchPage(), SearchParams (+4 more)

### Community 33 - "QA Screenshots S1-3"
Cohesion: 0.16
Nodes (14): Booking flow — search → slot select → 4-step wizard → confirmation, QA Review Current State — Full app UI screenshot, Sprint 1 Before — Initial state screenshot before styling improvements, Sprint 2 Final — Polished search/booking UI final state, Sprint 2 Hero — Search page hero section with gradient accents, Sprint 2 Results — Provider cards with stagger animations and cost badges, Sprint 2 Search — Specialty/location/insurance search filters, Sprint 3 Booking Step 1 — Patient details + reason + insurance selection (+6 more)

### Community 34 - "Carousel Components"
Cohesion: 0.20
Nodes (13): Carousel(), CarouselApi, CarouselContent(), CarouselContext, CarouselContextProps, CarouselItem(), CarouselNext(), CarouselOptions (+5 more)

### Community 36 - "Public API Endpoints"
Cohesion: 0.15
Nodes (13): /api/appointments, /api/geocode, /api/search/providers, /api/specialties/popular, /api/taxonomies, BookingPage, SearchPage, Haversine Distance Calculation (+5 more)

### Community 37 - "Clinic Detail Page"
Cohesion: 0.18
Nodes (10): ClinicDetailPage(), ClinicPageParams, DAY_LABELS, DayHours, formatTime24to12(), HoursOfWeek, JS_DAY_TO_KEY, PageProps (+2 more)

### Community 38 - "Analytics Dashboard"
Cohesion: 0.15
Nodes (7): AnalyticsData, COLORS, DailyTrend, ModalityData, Period, ProviderPerf, SummaryStats

### Community 39 - "Manual Booking Page"
Cohesion: 0.17
Nodes (9): BookingFormData, BookingResult, Insurance, Provider, Service, Slot, STEPS, Textarea() (+1 more)

### Community 40 - "Seed & Slot Generation"
Cohesion: 0.23
Nodes (8): dayOffset(), HOURS_OF_OPERATION, main(), nycToUTC(), hashPassword(), CLINIC_STATUS, PROVIDER_STATUS, SLOT_MODALITY

### Community 41 - "Patient Intake Form"
Cohesion: 0.17
Nodes (6): checkCirclePathVariants, checkmarkVariants, fadeInUp, IntakeData, PageState, staggerContainer

### Community 42 - "Provider Profile Page"
Cohesion: 0.20
Nodes (7): maskPatientName(), PageProps, ProviderPageParams, ProviderProfilePage(), ProviderAvailabilityCalendar(), ExpandableText(), ExpandableTextProps

### Community 43 - "Auth Middleware & Roles"
Cohesion: 0.23
Nodes (11): isValidStaffRole(), STAFF_ROLES, ADMIN_ONLY_ROUTES, config, createSignInRedirect(), createUnauthorizedRedirect(), getRequiredRoleForPath(), middleware() (+3 more)

### Community 44 - "Drawer Components"
Cohesion: 0.18
Nodes (6): DrawerContent(), DrawerDescription(), DrawerFooter(), DrawerHeader(), DrawerOverlay(), DrawerTitle()

### Community 45 - "New Booking Flow QA"
Cohesion: 0.20
Nodes (10): Login Screen, Manual Booking Step 1, Manual Booking Step 2, Booking Form (New Flow), Clinic Selection (New Flow), Confirmation Screen (New Flow), Home Screen (New Flow), Search Results (New Flow) (+2 more)

### Community 46 - "Staff Dashboard QA"
Cohesion: 0.22
Nodes (10): Manual Booking Entry Point, Performance Summary Card, Quick Actions Card, Recent Activity Feed, Sidebar Navigation, Staff Dashboard Page Screenshot, Staff Portal Concept, Dashboard Stat Cards (+2 more)

### Community 47 - "WebSocket Server"
Cohesion: 0.28
Nodes (8): createSystemMessage(), createUserMessage(), generateMessageId(), httpServer, io, Message, User, users

### Community 48 - "Dev Scripts"
Cohesion: 0.57
Nodes (5): log_step_end(), log_step_start(), dev.sh script, start_mini_services(), wait_for_service()

### Community 49 - "Auth Types & Session"
Cohesion: 0.33
Nodes (5): JWT, next-auth, next-auth/jwt, Session, User

### Community 50 - "Staff UI Flow Concepts"
Cohesion: 0.40
Nodes (5): Staff Appointments — list view with filter tabs (upcoming/past/cancelled), search bar, table with patient name, provider, time, status, Staff Calendar — date picker, provider filter, time-grid with appointments/slots, Staff Dashboard — empty/loading state before data fetches complete, Staff Dashboard — detail sub-page (appointment detail view, or analytics/activity tab), Staff Dashboard — loaded with stat cards (appointments today, new patients, revenue), upcoming schedule list, quick-action buttons

### Community 51 - "Patient Booking Flow QA"
Cohesion: 0.50
Nodes (5): Patient Booking — guardian/parental consent checkbox for pediatric patients (minor patient flow), Patient Booking — step 1 form (patient name, DOB, phone, email, reason for visit, insurance selection), Patient Booking — step 2 confirmation/review (summary of selected slot, provider, patient details, submit button), Clinic Detail page — clinic info, provider rows, reviews, insurance acceptance, amenities, Home/Provider-Search page (hero, specialty dropdown, adult/pediatric toggle, insurance, modality, distance slider, provider cards with slots)

### Community 52 - "Alert Components"
Cohesion: 0.50
Nodes (4): Alert(), AlertDescription(), AlertTitle(), alertVariants

### Community 53 - "Staff Booking API"
Cohesion: 0.50
Nodes (4): /api/staff/appointments, /api/staff/book, AppointmentsPage, Worklog Sprint 4

### Community 54 - "ESLint Config"
Cohesion: 0.50
Nodes (3): __dirname, eslintConfig, __filename

## Knowledge Gaps
- **431 isolated node(s):** `build.sh script`, `NEXT_TELEMETRY_DISABLED`, `start.sh script`, `$schema`, `style` (+426 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **45 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `cn()` connect `Navigation UI Components` to `Root Layout & Fonts`, `Staff Dashboard Layout`, `Loading States`, `Form & Sheet Components`, `WebSocket & Error Pages`, `Appointment Review UI`, `Charts & Visualization`, `Dialog UI Components`, `Clinics Directory`, `Hover & Progress UI`, `Patient Booking Page`, `Theme & Dropdown Menu`, `Booking Confirmation`, `Activity Notification Feed`, `Staff Appointment Views`, `Menu Bar Components`, `Context Menu Components`, `Carousel Components`, `Manual Booking Page`, `Provider Profile Page`, `Drawer Components`, `Alert Components`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **Why does `dependencies` connect `Dependencies & Packages` to `Root Layout & Fonts`, `Dev Tools & Config`, `Charts & Visualization`?**
  _High betweenness centrality (0.109) - this node is a cross-community bridge._
- **Why does `react` connect `Charts & Visualization` to `Dependencies & Packages`, `Carousel Components`, `Root Layout & Fonts`, `Form & Sheet Components`, `Dialog UI Components`, `Hover & Progress UI`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **What connects `build.sh script`, `NEXT_TELEMETRY_DISABLED`, `start.sh script` to the rest of the system?**
  _443 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Dependencies & Packages` be split into smaller, more focused modules?**
  _Cohesion score 0.030303030303030304 - nodes in this community are weakly interconnected._
- **Should `Core Architecture & Design` be split into smaller, more focused modules?**
  _Cohesion score 0.060496067755595885 - nodes in this community are weakly interconnected._
- **Should `Root Layout & Fonts` be split into smaller, more focused modules?**
  _Cohesion score 0.058823529411764705 - nodes in this community are weakly interconnected._