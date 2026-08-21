const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  console.log('🧹 Cleaning database and initializing MCAD production environment...');

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

  // Read admin credentials from environment or defaults
  const firstName = process.env.ADMIN_FIRST_NAME || "David";
  const lastName = process.env.ADMIN_LAST_NAME || "Kouassi";
  const phone = process.env.ADMIN_PHONE || "+33 6 99 88 77 66";
  const email = (process.env.ADMIN_EMAIL || "admin@mcad.org").toLowerCase().trim();
  const rawPassword = process.env.ADMIN_PASSWORD || "AdminPassword2026!";
  const role = "SUPER_ADMIN";

  const hashedPassword = await bcrypt.hash(rawPassword, 10);

  // 1. Create MCAD Department
  const dept = await prisma.department.create({
    data: {
      name: "MCAD",
      description: "Ministère Chrétien d'Action et de Développement — Plateforme de coordination et gestion.",
      logo: "/logo.png",
      settings: JSON.stringify({
        reminderHour: 21,
        autoReminder: true,
        allowMultiPoles: true,
        strictConflictCheck: true,
      })
    }
  });

  // 2. Create Super Admin User
  const admin = await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phone,
      password: hashedPassword,
      gender: "HOMME",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      role,
      status: "ACTIVE",
      departmentId: dept.id
    }
  });

  // 3. Create Default Ministry Poles
  const polesData = [
    { name: "Louange & Adoration", description: "Animation musicale et temps de louange des cultes", icon: "Music", color: "#8b5cf6" },
    { name: "Accueil & Protocole", description: "Accueil chaleureux des fidèles et orientation", icon: "Users", color: "#10b981" },
    { name: "Intercession & Prière", description: "Soutien spirituel, jeûne et prières d'équipe", icon: "HeartHandshake", color: "#3b82f6" },
    { name: "Technique & Multimédia", description: "Sonorisation, régie vidéo et diffusion live", icon: "Sliders", color: "#f59e0b" }
  ];

  for (let i = 0; i < polesData.length; i++) {
    const p = polesData[i];
    const createdPole = await prisma.pole.create({
      data: {
        departmentId: dept.id,
        name: p.name,
        description: p.description,
        icon: p.icon,
        color: p.color,
        orderIndex: i,
        status: "ACTIVE"
      }
    });

    // Assign admin as leader
    await prisma.poleLeader.create({
      data: {
        poleId: createdPole.id,
        userId: admin.id,
        roleTitle: "Responsable"
      }
    });

    await prisma.poleMembership.create({
      data: {
        poleId: createdPole.id,
        userId: admin.id,
        status: "ACTIVE"
      }
    });
  }

  // 4. Create Welcome Notification
  await prisma.notification.create({
    data: {
      userId: admin.id,
      title: "Bienvenue sur MCAD",
      message: "Votre plateforme MCAD est initialisée. Vos pôles et votre compte administrateur sont prêts.",
      type: "WELCOME"
    }
  });

  console.log(`✅ Base de données initialisée avec succès !`);
  console.log(`👤 Compte Administrateur : ${firstName} ${lastName}`);
  console.log(`📱 Numéro : ${phone}`);
  console.log(`🔑 Mot de passe : ${rawPassword}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
