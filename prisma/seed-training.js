const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedTraining() {
  const poles = await prisma.pole.findMany();
  if (poles.length === 0) return;

  const count = await prisma.trainingModule.count();
  if (count > 0) {
    console.log('Training modules already exist.');
    return;
  }

  for (const pole of poles) {
    if (pole.name.toLowerCase().includes('titrage') || pole.name.toLowerCase().includes('sous')) {
      await prisma.trainingModule.create({
        data: {
          poleId: pole.id,
          title: "Les Fondamentaux du Sous-titrage & ProPresenter",
          description: "Maîtriser l'affichage des paroles, des versets bibliques et des synthés pendant les cultes.",
          level: "BEGINNER",
          estimatedDuration: "35 min",
          coverImage: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
          lessons: {
            create: [
              {
                orderIndex: 1,
                title: "Introduction au logiciel et prise en main",
                description: "Comprendre l'interface de diffusion et les raccourcis clés.",
                durationMinutes: 10,
                mediaType: "VIDEO",
                mediaUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
                content: "Dans cette leçon, nous découvrons l'interface principale, la gestion des playlists de culte et la vérification des sorties d'écran avant le début du service."
              },
              {
                orderIndex: 2,
                title: "Synchronisation avec le conducteur de louange",
                description: "Anticiper les refrains, ponts et répétitions spontanées.",
                durationMinutes: 15,
                mediaType: "PHOTO",
                mediaUrl: "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=800&auto=format&fit=crop&q=80",
                content: "Apprenez à garder un temps d'avance sur le chant pour que l'assemblée puisse chanter sans interruption. Toujours projeter la première ligne 1 seconde avant le début de la voix."
              },
              {
                orderIndex: 3,
                title: "Gestion des imprévus et versets à la volée",
                description: "Comment rechercher et afficher un verset rapidement pendant la prédication.",
                durationMinutes: 10,
                mediaType: "NONE",
                content: "Utilisation du raccourci recherche rapide (Cmd/Ctrl + F) pour sélectionner la version de la Bible (Louis Segond / NFC) et envoyer le passage en toute discrétion."
              }
            ]
          }
        }
      });
    } else if (pole.name.toLowerCase().includes('sono') || pole.name.toLowerCase().includes('son')) {
      await prisma.trainingModule.create({
        data: {
          poleId: pole.id,
          title: "Guide de la Régie Son & Balance Musicale",
          description: "Techniques de mixage, égalisation des micros sans fil et gestion des retours in-ear.",
          level: "INTERMEDIATE",
          estimatedDuration: "45 min",
          coverImage: "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&auto=format&fit=crop&q=80",
          lessons: {
            create: [
              {
                orderIndex: 1,
                title: "Allumage sécurisé et check des micros HF",
                description: "Procédure d'ordre d'allumage des amplis et console numérique.",
                durationMinutes: 15,
                mediaType: "PHOTO",
                mediaUrl: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80",
                content: "Toujours allumer la console et les périphériques AVANT les amplificateurs de puissance pour éviter les claquements dangereux."
              },
              {
                orderIndex: 2,
                title: "Égalisation de la voix du pasteur et intelligibilité",
                description: "Nettoyer les bas médiums et couper le larsen sans dénaturer le timbre.",
                durationMinutes: 20,
                mediaType: "NONE",
                content: "Appliquer un coupe-bas (High-Pass Filter) à 90Hz, creuser légèrement autour de 300Hz-400Hz pour la clarté et ajouter une légère compression."
              },
              {
                orderIndex: 3,
                title: "Mixage pour le Stream Live vs Salle",
                description: "Différencier le mixage physique de la diffusion internet.",
                durationMinutes: 10,
                mediaType: "NONE",
                content: "Le mixage streaming nécessite un bus dédié avec limitation/compression globale pour maintenir un niveau sonore constant et agréable sur smartphone."
              }
            ]
          }
        }
      });
    } else {
      await prisma.trainingModule.create({
        data: {
          poleId: pole.id,
          title: `Guide d'Excellence & Intégration - ${pole.name}`,
          description: `Toutes les étapes pour bien servir au sein du pôle ${pole.name} avec excellence.`,
          level: "BEGINNER",
          estimatedDuration: "25 min",
          coverImage: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=800&auto=format&fit=crop&q=80",
          lessons: {
            create: [
              {
                orderIndex: 1,
                title: "La vision et le cœur du service",
                description: "Servir Dieu avec humilité, ponctualité et engagement.",
                durationMinutes: 10,
                mediaType: "NONE",
                content: "Le service à l'église est un ministère spirituel. Arriver 30 minutes avant le début de la répétition permet de prier et de préparer l'atmosphère."
              },
              {
                orderIndex: 2,
                title: "Communication et coordination d'équipe",
                description: "Utiliser la plateforme MCAD pour signaler ses indisponibilités et exécuter les checklists.",
                durationMinutes: 15,
                mediaType: "NONE",
                content: "Toujours valider son service à l'issue du culte et remplir la checklist correspondante pour assurer la continuité."
              }
            ]
          }
        }
      });
    }
  }

  console.log('✅ Modules de formation créés avec succès !');
}

seedTraining()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
