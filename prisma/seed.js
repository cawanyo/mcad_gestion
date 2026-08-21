const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database and initializing clean admin environment...');

  // Delete all existing data
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.serviceValidation.deleteMany();
  await prisma.checklistExecutionStep.deleteMany();
  await prisma.checklistExecution.deleteMany();
  await prisma.eventChecklist.deleteMany();
  await prisma.checklistStep.deleteMany();
  await prisma.checklist.deleteMany();
  await prisma.unavailability.deleteMany();
  await prisma.memberInterest.deleteMany();
  await prisma.assignment.deleteMany();
  await prisma.eventRequirement.deleteMany();
  await prisma.event.deleteMany();
  await prisma.membershipRequest.deleteMany();
  await prisma.poleMembership.deleteMany();
  await prisma.poleLeader.deleteMany();
  await prisma.pole.deleteMany();
  await prisma.user.deleteMany();
  await prisma.department.deleteMany();

  // Read admin credentials from environment
  const firstName = process.env.ADMIN_FIRST_NAME || "David";
  const lastName = process.env.ADMIN_LAST_NAME || "Kouassi";
  const email = (process.env.ADMIN_EMAIL || "admin@egliseunie.org").toLowerCase().trim();
  const rawPassword = process.env.ADMIN_PASSWORD || "AdminPassword2026!";
  const role = process.env.ADMIN_ROLE || "SUPER_ADMIN";

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // Create initial Department
  const dept = await prisma.department.create({
    data: {
      name: "Église Unie",
      description: "Plateforme de gestion et de coordination des départements et pôles.",
      logo: "/logo.png",
      settings: JSON.stringify({
        reminderHour: 21,
        autoReminder: true,
        allowMultiPoles: true,
        strictConflictCheck: true,
      })
    }
  });

  // Create Initial Admin User
  const admin = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      password: hashedPassword,
      phone: "+33 6 12 34 56 78",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role: "DEPARTMENT_LEADER",
      status: "ACTIVE",
      departmentId: dept.id
    }
  });

  // Create welcome notification
  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: "Bienvenue sur votre plateforme",
      message: "Votre espace est initialisé et prêt à être configuré. Commencez par créer vos premiers pôles et événements.",
      type: "WELCOME"
    }
  });

  console.log(`✅ Base de données initialisée avec succès !`);
  console.log(`👤 Compte Administrateur créé : ${firstName} ${lastName} (${email})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
