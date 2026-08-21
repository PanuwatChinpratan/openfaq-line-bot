# OpenFAQ Bot — Implementation Plan

เป้าหมายคือสร้าง LINE FAQ assistant แบบ open source ที่ clone แล้วรันได้จริง โดยคงระบบให้เล็ก อ่านง่าย และไม่เพิ่ม infrastructure ที่ยังไม่จำเป็น

## Stack

- NestJS + TypeScript สำหรับ API และ LINE webhook
- React + Vite สำหรับ Chat Demo และ Admin
- PostgreSQL + Prisma + pgvector/pg_trgm สำหรับ FAQ และ hybrid search
- multilingual-e5-small สำหรับ embedding ในเครื่อง
- Ollama + Qwen3 4B เป็น local AI แบบ optional
- Biome สำหรับ format/lint/imports
- Docker Compose, Jest และ browser smoke test

## Build order

1. เปลี่ยนข้อมูลและชื่อแบรนด์เป็น OpenFAQ Bot พร้อม FAQ ร้านค้าออนไลน์สมมติ
2. ทำ exact → fuzzy → vector → RRF retrieval พร้อม confidence และ safe fallback
3. เพิ่ม public chat API, LINE webhook, Flex response, feedback และ persistent dedup
4. เพิ่ม owner login และ CRUD/publish FAQ
5. ทำ Chat Demo, Knowledge, Architecture และ Admin UI ตาม approved concepts
6. เพิ่ม tests, CI, Docker, README และ security/license docs

## Done when

- ผู้ใช้พิมพ์ผิดหรือถามคนละสำนวนแล้วยังเจอ FAQ ที่ถูกต้อง
- ระบบไม่ให้ LLM เดาคำตอบเมื่อ retrieval ไม่มั่นใจ
- Public Lite ใช้ได้โดยไม่มี API key; Local AI fallback ได้เมื่อ Ollama ปิด
- LINE signature, admin mutation และข้อมูลส่วนตัวได้รับการป้องกัน
- `npm run check`, `npm run typecheck`, tests และ builds ผ่าน
- UI responsive และเทียบกับ approved concepts แล้วไม่มีจุดต่างที่กระทบการใช้งาน

รายละเอียดทางเทคนิคและ API contracts อยู่ใน README เพื่อไม่ให้เอกสารซ้ำซ้อน
