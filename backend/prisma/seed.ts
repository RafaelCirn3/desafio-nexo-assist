import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
const staff = [
  { name: "Ana Martins", email: "ana.martins@nexo.example", department: "Financeiro", role: "EMPLOYEE" },
  { name: "Bruno Silva", email: "bruno.silva@nexo.example", department: "Operações", role: "EMPLOYEE" },
  { name: "Carla Souza", email: "carla.souza@nexo.example", department: "TI", role: "ANALYST_N1" },
  { name: "Diego Lima", email: "diego.lima@nexo.example", department: "TI", role: "ANALYST_N2" },
];
try {
  for (const member of staff) await prisma.employee.upsert({ where: { email: member.email }, update: {}, create: member });
  console.log("Demo users seeded:", staff.map(x => x.email).join(", "));
} finally { await prisma.$disconnect(); }
