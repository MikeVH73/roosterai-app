# AI Assistant Known Issues

This document lists known limitations, confusing flows and potential user problems within RoosterAI.

The purpose of this file is to help AI agents, support agents and engineers understand where users may struggle.

---

# Onboarding Complexity

## Problem
The onboarding process requires several configuration steps before the first schedule can be created.

Required setup steps:

1. Functions & Skills
2. Locations
3. Location Types
4. Departments
5. Employees
6. Contract hours
7. Availability
8. Schedule creation

## Risk
Users may not understand that these steps depend on each other.

If the order is unclear, users may abandon the setup before reaching the first schedule.

## Desired Improvement
Provide a structured onboarding wizard that guides users step by step.

---

# Planning Helper Expectations

## Problem
Users may expect the Planning Helper to automatically generate a complete schedule without proper setup.

## Risk
If employee availability, functions or departments are incomplete, the AI planner cannot generate correct results.

## Desired Improvement
The system should validate required setup before enabling the AI planner.

---

# Employee Data Quality

## Problem
Incorrect or incomplete employee data leads to planning conflicts.

Examples:
- missing contract hours
- missing functions
- incomplete availability

## Risk
The schedule generator may produce unrealistic schedules.

## Desired Improvement
Implement data validation before planning.

---

# Feature Discoverability

## Problem
New users may not understand where important features are located.

Examples:
- Planning Helper
- Availability management
- Functions & Skills

## Desired Improvement
Improve UI guidance and contextual help.

---

# AI Assistant Role

The AI assistant should help users by:

- explaining setup steps
- guiding users through onboarding
- detecting incomplete configuration
- suggesting next actions
- preventing planning errors

---

# Notes

This document should be updated whenever new user friction or product limitations are discovered.
