// @ts-nocheck
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load .env from monorepo root (two levels up from packages/db/)
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '..', '..', '..', '.env') });

import mongoose from 'mongoose';
import { connectDB, disconnectDB } from './connection.js';
import { User } from './models/User.js';
import { Supplier } from './models/Supplier.js';
import { Category } from './models/Category.js';
import { Product } from './models/Product.js';
import { Formation } from './models/Formation.js';
import { Event } from './models/Event.js';
import { SubscriptionPlan } from './models/SubscriptionPlan.js';
import { AgriHelpRequest } from './models/AgriHelpRequest.js';
import bcrypt from 'bcryptjs';

// Hash password with bcrypt (same as the login route)
function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

function slug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function daysFromNow(days: number): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

async function seed() {
  console.log('🌱 Connecting to MongoDB...');
  await connectDB();

  // Clear existing data
  const collections = mongoose.connection.collections;
  for (const key in collections) {
    await collections[key]!.deleteMany({});
  }
  console.log('🗑️  Cleared all collections');

  // ─── Subscription Plans ────────────────────────────────────
  const plans = await SubscriptionPlan.create([
    {
      name: 'Starter', slug: 'starter',
      price: { monthly: 5000, annual: 50000 },
      features: { maxProducts: 20, featuredSlots: 0, analyticsAccess: false, prioritySupport: false, bulkOrderAccess: false },
    },
    {
      name: 'Professional', slug: 'professional',
      price: { monthly: 15000, annual: 150000 },
      features: { maxProducts: 100, featuredSlots: 5, analyticsAccess: true, prioritySupport: false, bulkOrderAccess: true },
    },
    {
      name: 'Enterprise', slug: 'enterprise',
      price: { monthly: 40000, annual: 400000 },
      features: { maxProducts: 500, featuredSlots: 20, analyticsAccess: true, prioritySupport: true, bulkOrderAccess: true },
    },
  ]);
  console.log(`✅ Created ${plans.length} subscription plans`);

  // ─── Admin User ────────────────────────────────────────────
  const admin = await User.create({
    email: 'admin@tunagri.dz',
    passwordHash: hashPassword('Admin@2025!'),
    role: 'ADMIN',
    badge: { type: 'PRIME', isActive: true },
    profile: { firstName: 'Admin', lastName: 'TunAgri', country: 'TN', city: 'Tunis' },
    isEmailVerified: true,
  });
  console.log('✅ Created admin user');

  // ─── Specialist Users (Agronomists, Veterinarians, etc.) ────
  const specialistData = [
    {
      email: 'dr.ben@tunagri.dz',
      firstName: 'Karim', lastName: 'Ben Slimane',
      speciality: 'Agronomist', city: 'Sfax',
      bio: 'Agronomist with 15 years experience in crop management and sustainable farming',
      workSummary: 'Certified Agronomist, INRAA certified, 150+ consultations completed',
    },
    {
      email: 'dr.vet.dz@tunagri.dz',
      firstName: 'Dr. Fatima', lastName: 'Bouslimani',
      speciality: 'Veterinarian', city: 'Tunis',
      bio: 'Licensed veterinarian specializing in livestock health and reproduction',
      workSummary: 'DVM licensed, 12 years in cattle and poultry health management, 200+ clients',
    },
    {
      email: 'pest.control@tunagri.dz',
      firstName: 'Mohamed', lastName: 'Charaoui',
      speciality: 'Pest Management Specialist', city: 'Béja',
      bio: 'Expert in integrated pest management for crops and farm animals',
      workSummary: 'IPM certified, organic agriculture specialist, 100+ consultations',
    },
    {
      email: 'soil.expert@tunagri.dz',
      firstName: 'Nadia', lastName: 'Hamadi',
      speciality: 'Soil Scientist', city: 'Sétif',
      bio: 'Soil analysis and improvement specialist for Mediterranean climates',
      workSummary: 'MSc Soil Science, soil testing lab certified, 180+ farms analyzed',
    },
    {
      email: 'nutrition.vet@tunagri.dz',
      firstName: 'Yacine', lastName: 'Moussaoui',
      speciality: 'Animal Nutritionist', city: 'Annaba',
      bio: 'Specialist in livestock nutrition and feed formulation',
      workSummary: 'Animal nutrition specialist, 120+ dairy and beef consultations',
    },
    {
      email: 'horticulture@tunagri.dz',
      firstName: 'Samira', lastName: 'Chabani',
      speciality: 'Horticulturist', city: 'Sousse',
      bio: 'Vegetable and fruit crop specialist for greenhouses and open fields',
      workSummary: 'Horticulture engineer, 11 years experience, 95+ clients',
    },
  ];

  const specialists: Array<{ user: any }> = [];

  for (const s of specialistData) {
    const user = await User.create({
      email: s.email,
      passwordHash: hashPassword('Specialist@2025!'),
      role: 'AGRI_ENGINEER',
      badge: { type: 'PRIME', isActive: true, issuedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      profile: {
        firstName: s.firstName,
        lastName: s.lastName,
        country: 'TN',
        city: s.city,
        speciality: s.speciality,
        bio: s.bio,
        workSummary: s.workSummary,
      },
      isEmailVerified: true,
    });

    specialists.push({ user });
  }
  console.log(`✅ Created ${specialists.length} specialist users (agronomists, vets, etc.)`);

  // ─── Training Center Users ─────────────────────────────────
  const trainingCenterData = [
    {
      email: 'formations@green-academy.dz',
      password: 'TrainingCenter@2025!',
      firstName: 'Green',
      lastName: 'Academy',
      centerName: 'Green Academy',
      city: 'Blida',
      speciality: 'Centre de formation agricole',
      bio: 'Centre dédié aux formations pratiques en irrigation, semences, serres et conduite de projet agricole.',
      workSummary: 'Ateliers certifiants, sessions en présentiel et programmes courts pour agriculteurs et techniciens.',
      location: { lat: 36.4722, lng: 2.8333, label: 'Blida - Campus principal' },
    },
    {
      email: 'contact@oasis-training.dz',
      password: 'TrainingCenter@2025!',
      firstName: 'Oasis',
      lastName: 'Training',
      centerName: 'Oasis Training Center',
      city: 'Sfax',
      speciality: 'Centre de formation agroalimentaire',
      bio: 'Formations spécialisées en transformation, hygiène, élevage et valorisation des produits agricoles.',
      workSummary: 'Parcours courts, sessions thématiques et accompagnement des jeunes porteurs de projets.',
      location: { lat: 34.7398, lng: 10.7603, label: 'Sfax - Pôle formation' },
    },
    {
      email: 'info@mediterranee-formations.dz',
      password: 'TrainingCenter@2025!',
      firstName: 'Méditerranée',
      lastName: 'Formations',
      centerName: 'Méditerranée Formations',
      city: 'Tunis',
      speciality: 'Centre de formation en innovation agricole',
      bio: 'Centre orienté vers l’agritech, l’irrigation intelligente et les bonnes pratiques terrain.',
      workSummary: 'Sessions certifiantes avec démonstrations, visites techniques et calendrier public.',
      location: { lat: 36.8065, lng: 10.1815, label: 'Tunis - Centre ville' },
    },
  ];

  const trainingCenters: Array<{ user: any }> = [];

  for (const center of trainingCenterData) {
    const user = await User.create({
      email: center.email,
      passwordHash: hashPassword(center.password),
      role: 'TRAINING_CENTER',
      badge: { type: 'PRIME', isActive: true, issuedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) },
      profile: {
        firstName: center.firstName,
        lastName: center.lastName,
        country: 'TN',
        city: center.city,
        speciality: center.speciality,
        bio: center.bio,
        workSummary: center.workSummary,
        location: center.location,
      },
      isEmailVerified: true,
    });

    trainingCenters.push({ user });
  }

  console.log(`✅ Created ${trainingCenters.length} training center users`);

  // ─── Buyer Users ───────────────────────────────────────────
  const buyerFree = await User.create({
    email: 'buyer@tunagri.dz',
    passwordHash: hashPassword('Buyer@2025!'),
    role: 'BUYER',
    badge: { type: 'FREE', isActive: false },
    profile: { firstName: 'Karim', lastName: 'Bensalem', country: 'TN', city: 'Sfax' },
    isEmailVerified: true,
  });

  const buyerPrime = await User.create({
    email: 'buyer.prime@tunagri.dz',
    passwordHash: hashPassword('BuyerPrime@2025!'),
    role: 'BUYER',
    badge: {
      type: 'PRIME', isActive: true,
      issuedAt: new Date(), expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    },
    profile: { firstName: 'Amina', lastName: 'Hadj', country: 'TN', city: 'Sousse' },
    isEmailVerified: true,
  });
  console.log('✅ Created buyer users (FREE + PRIME)');

  // ─── Agricultural & Animal Care Categories ─────────────────
  // Crop Production Root
  const catCropProd = await Category.create({
    name: 'Production Végétale', slug: 'production-vegetale',
    icon: '🌱', sector: 'AGRICULTURAL', depth: 0,
  });
  const catSeeds = await Category.create({
    parentId: catCropProd._id, name: 'Semences', slug: 'semences',
    icon: '🌾', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catCropProd._id, name: catCropProd.name, slug: catCropProd.slug }],
  });
  const catCereals = await Category.create({
    parentId: catSeeds._id, name: 'Céréales', slug: 'cereales',
    icon: '🌾', sector: 'AGRICULTURAL', depth: 2,
    ancestors: [
      { _id: catCropProd._id, name: catCropProd.name, slug: catCropProd.slug },
      { _id: catSeeds._id, name: catSeeds.name, slug: catSeeds.slug },
    ],
  });
  const catVegetables = await Category.create({
    parentId: catSeeds._id, name: 'Légumes', slug: 'legumes',
    icon: '🥕', sector: 'AGRICULTURAL', depth: 2,
    ancestors: [
      { _id: catCropProd._id, name: catCropProd.name, slug: catCropProd.slug },
      { _id: catSeeds._id, name: catSeeds.name, slug: catSeeds.slug },
    ],
  });

  // Soil & Nutrients
  const catSoil = await Category.create({
    name: 'Sols & Nutriments', slug: 'sols-nutriments',
    icon: '🧪', sector: 'AGRICULTURAL', depth: 0,
  });
  const catFertilizers = await Category.create({
    parentId: catSoil._id, name: 'Engrais', slug: 'engrais',
    icon: '♻️', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catSoil._id, name: catSoil.name, slug: catSoil.slug }],
  });
  const catSoilAmendments = await Category.create({
    parentId: catSoil._id, name: 'Amendements', slug: 'amendements',
    icon: '🪱', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catSoil._id, name: catSoil.name, slug: catSoil.slug }],
  });

  // Crop Protection
  const catCropProtection = await Category.create({
    name: 'Protection des Cultures', slug: 'protection-cultures',
    icon: '🛡️', sector: 'AGRICULTURAL', depth: 0,
  });
  const catPesticides = await Category.create({
    parentId: catCropProtection._id, name: 'Pesticides', slug: 'pesticides',
    icon: '🧬', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catCropProtection._id, name: catCropProtection.name, slug: catCropProtection.slug }],
  });
  const catFungicides = await Category.create({
    parentId: catCropProtection._id, name: 'Fongicides', slug: 'fongicides',
    icon: '🍄', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catCropProtection._id, name: catCropProtection.name, slug: catCropProtection.slug }],
  });

  // Livestock & Animal Care Root
  const catLivestock = await Category.create({
    name: 'Élevage & Animaux', slug: 'elevage-animaux',
    icon: '🐄', sector: 'AGRICULTURAL', depth: 0,
  });
  const catCattleSupply = await Category.create({
    parentId: catLivestock._id, name: 'Bovins', slug: 'bovins',
    icon: '🐂', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catLivestock._id, name: catLivestock.name, slug: catLivestock.slug }],
  });
  const catPoultry = await Category.create({
    parentId: catLivestock._id, name: 'Volailles', slug: 'volailles',
    icon: '🐔', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catLivestock._id, name: catLivestock.name, slug: catLivestock.slug }],
  });

  // Animal Health & Nutrition
  const catAnimalHealth = await Category.create({
    name: 'Santé & Nutrition Animale', slug: 'sante-nutrition-animale',
    icon: '💊', sector: 'AGRICULTURAL', depth: 0,
  });
  const catVetMedicines = await Category.create({
    parentId: catAnimalHealth._id, name: 'Médicaments Vétérinaires', slug: 'medicaments-veterinaires',
    icon: '🩺', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catAnimalHealth._id, name: catAnimalHealth.name, slug: catAnimalHealth.slug }],
  });
  const catAnimalFeed = await Category.create({
    parentId: catAnimalHealth._id, name: 'Alimentation Animale', slug: 'alimentation-animale',
    icon: '🥗', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catAnimalHealth._id, name: catAnimalHealth.name, slug: catAnimalHealth.slug }],
  });
  const catSupplements = await Category.create({
    parentId: catAnimalHealth._id, name: 'Suppléments Nutritionnels', slug: 'supplements-nutritionnels',
    icon: '💉', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catAnimalHealth._id, name: catAnimalHealth.name, slug: catAnimalHealth.slug }],
  });

  // Equipment
  const catEquipment = await Category.create({
    name: 'Équipements & Accessoires', slug: 'equipements-accessoires',
    icon: '🔧', sector: 'AGRICULTURAL', depth: 0,
  });
  const catFarmEquip = await Category.create({
    parentId: catEquipment._id, name: 'Équipements Agricoles', slug: 'equipements-agricoles',
    icon: '🚜', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catEquipment._id, name: catEquipment.name, slug: catEquipment.slug }],
  });
  const catIrrigation = await Category.create({
    parentId: catEquipment._id, name: 'Irrigation', slug: 'irrigation',
    icon: '💧', sector: 'AGRICULTURAL', depth: 1,
    ancestors: [{ _id: catEquipment._id, name: catEquipment.name, slug: catEquipment.slug }],
  });

  console.log('✅ Created 20+ agricultural & animal care categories');

  // ─── Supplier Users + Profiles (Agricultural Focus) ─────────
  const supplierData = [
    {
      email: 'contact@greenfields.dz', company: 'GreenFields SA', sector: 'AGRICULTURAL' as const,
      firstName: 'Ali', lastName: 'Mansouri', city: 'Sétif', wilaya: 'Sétif',
      bio: 'Leading seed and fertilizer supplier for North Africa',
    },
    {
      email: 'info@agrisol.dz', company: 'AgriSol Solutions', sector: 'AGRICULTURAL' as const,
      firstName: 'Samira', lastName: 'Berkane', city: 'Batna', wilaya: 'Batna',
      bio: 'Specialized in organic fertilizers and soil amendments',
    },
    {
      email: 'contact@terroir-dz.com', company: 'Terroir DZ', sector: 'AGRICULTURAL' as const,
      firstName: 'Mustapha', lastName: 'Chaoui', city: 'Biskra', wilaya: 'Biskra',
      bio: 'Date palm and vegetable seed specialist',
    },
    {
      email: 'contact@sahara-agri.dz', company: 'Sahara Agri', sector: 'AGRICULTURAL' as const,
      firstName: 'Wassila', lastName: 'Toumi', city: 'Ghardaia', wilaya: 'Ghardaia',
      bio: 'Desert farming equipment and solutions',
    },
    {
      email: 'info@mitidja-farm.dz', company: 'Mitidja Farm Supply', sector: 'AGRICULTURAL' as const,
      firstName: 'Djamel', lastName: 'Brahimi', city: 'Blida', wilaya: 'Blida',
      bio: 'Comprehensive farm supplies and equipment distributor',
    },
    {
      email: 'contact@vetagri.dz', company: 'VetAgri Pharma', sector: 'AGRICULTURAL' as const,
      firstName: 'Dr. Karim', lastName: 'Boudaoud', city: 'Algiers', wilaya: 'Alger',
      bio: 'Veterinary medicines and animal nutrition products',
    },
    {
      email: 'info@livestock-solutions.dz', company: 'Livestock Solutions TN', sector: 'AGRICULTURAL' as const,
      firstName: 'Fatima', lastName: 'Jaziri', city: 'Sousse', wilaya: 'Sousse',
      bio: 'Cattle feed, supplements and health products',
    },
    {
      email: 'contact@pestcare.dz', company: 'PestCare Innovation', sector: 'AGRICULTURAL' as const,
      firstName: 'Yacine', lastName: 'Hamidi', city: 'Tunis', wilaya: 'Tunis',
      bio: 'Integrated pest management and crop protection solutions',
    },
    {
      email: 'info@agritech-innovation.dz', company: 'AgroTech Innovation', sector: 'AGRICULTURAL' as const,
      firstName: 'Nadia', lastName: 'Benmabrouk', city: 'Ariana', wilaya: 'Ariana',
      bio: 'Modern farming equipment and irrigation systems',
    },
    {
      email: 'contact@poultry-pro.dz', company: 'PoultryPro Supplies', sector: 'AGRICULTURAL' as const,
      firstName: 'Hassan', lastName: 'Abdelhadi', city: 'Sfax', wilaya: 'Sfax',
      bio: 'Complete poultry farming solutions and feeds',
    },
  ];

  const suppliers: Array<{ user: any; supplier: any }> = [];
  const proPlan = plans[1]!;

  for (const s of supplierData) {
    const user = await User.create({
      email: s.email,
      passwordHash: hashPassword('Supplier@2025!'),
      role: 'SUPPLIER',
      badge: { type: 'PRIME', isActive: true },
      profile: { firstName: s.firstName, lastName: s.lastName, country: 'TN', city: s.city },
      isEmailVerified: true,
    });

    const supplier = await Supplier.create({
      userId: user._id,
      slug: slug(s.company),
      companyName: s.company,
      sector: s.sector,
      isVerified: true,
      subscription: {
        planId: proPlan._id,
        planName: proPlan.name,
        startDate: new Date(),
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        isActive: true,
        maxProducts: proPlan.features.maxProducts,
        featuredSlots: proPlan.features.featuredSlots,
        analyticsAccess: proPlan.features.analyticsAccess,
      },
      addresses: [{
        label: 'Siège', addressLine: `Zone Industrielle, ${s.city}`,
        city: s.city, wilaya: s.wilaya, country: 'TN', isHeadquarters: true,
      }],
      certifications: s.sector === 'MEDICAL'
        ? [{ name: 'ISO 13485', issuer: 'Bureau Veritas', year: 2023 }]
        : [{ name: 'Agriculture Bio', issuer: 'INRAA', year: 2024 }],
      stats: {
        totalProducts: 6,
        totalOrders: Math.floor(Math.random() * 200) + 10,
        totalRevenue: Math.floor(Math.random() * 5000000) + 100000,
        profileViews: Math.floor(Math.random() * 1000) + 50,
        averageRating: +(3.5 + Math.random() * 1.5).toFixed(1),
        totalReviews: Math.floor(Math.random() * 50) + 5,
        responseRate: Math.floor(Math.random() * 30) + 70,
      },
    });

    suppliers.push({ user, supplier });
  }
  console.log(`✅ Created ${suppliers.length} suppliers (agricultural focus)`);

  // ─── Super Supplier (SuplierSuperPrimium) ─────────────────────────
  // Create one SUPER_SUPPLIER who can publish superGross prices and manage a view list
  const superSupplierUser = await User.create({
    email: 'super.supplier@tunagri.dz',
    passwordHash: hashPassword('SuperSupplier@2025!'),
    role: 'SUPER_SUPPLIER',
    badge: { type: 'PRIME', isActive: true },
    profile: { firstName: 'Super', lastName: 'Supplier', country: 'TN', city: 'Tunis' },
    isEmailVerified: true,
  });

  // We'll allow this Super Supplier to grant view access to the first 3 existing suppliers
  const allowedSupplierIds = suppliers.slice(0, 3).map((s) => s.supplier._id);

  const superSupplierProfile = await Supplier.create({
    userId: superSupplierUser._id,
    slug: slug('super-supplier-ag'),
    companyName: 'Super Supplier AG',
    sector: 'AGRICULTURAL',
    isVerified: true,
    subscription: {
      planId: proPlan._id,
      planName: proPlan.name,
      startDate: new Date(),
      endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      isActive: true,
      maxProducts: proPlan.features.maxProducts,
      featuredSlots: proPlan.features.featuredSlots,
      analyticsAccess: proPlan.features.analyticsAccess,
    },
    addresses: [{ label: 'Siège', addressLine: 'Centre', city: 'Tunis', wilaya: 'Tunis', country: 'TN', isHeadquarters: true }],
    certifications: [{ name: 'Super Distributor', issuer: 'TunAgri', year: 2025 }],
    stats: { totalProducts: 0, totalOrders: 0, totalRevenue: 0, profileViews: 0, averageRating: 5, totalReviews: 0, responseRate: 100 },
    settings: {
      showPhonePublicly: true,
      autoConfirmOrders: false,
      notifyNewOrder: true,
      notifyLowStock: true,
      superGrossViewList: allowedSupplierIds,
    },
  });

  console.log('✅ Created SUPER_SUPPLIER account: super.supplier@tunagri.dz / SuperSupplier@2025!');

  // ─── Training Center Formations ────────────────────────────
  const formationTemplates = [
    {
      title: 'Gestion moderne de l’irrigation goutte à goutte',
      description: 'Formation pratique sur le dimensionnement, l’entretien et l’optimisation des systèmes d’irrigation économes en eau.',
      location: 'Blida',
      offsetDays: 12,
      participants: 42,
      questions: [
        { label: 'Nom de l’exploitation', type: 'TEXT' as const, required: true },
        { label: 'Surface irriguée (ha)', type: 'TEXT' as const, required: true },
      ],
    },
    {
      title: 'Techniques de semis et sélection variétale',
      description: 'Apprenez à sélectionner les variétés adaptées, préparer le lit de semence et maximiser la levée.',
      location: 'Blida',
      offsetDays: -18,
      participants: 31,
      questions: [
        { label: 'Culture principale', type: 'TEXT' as const, required: true },
      ],
    },
    {
      title: 'Hygiène et transformation des produits agricoles',
      description: 'Atelier dédié aux bonnes pratiques d’hygiène, à la chaîne du froid et à la valeur ajoutée des produits.',
      location: 'Sfax',
      offsetDays: 21,
      participants: 55,
      questions: [
        { label: 'Type de production', type: 'TEXT' as const, required: true },
        { label: 'Avez-vous déjà transformé vos produits ?', type: 'SELECT' as const, required: true, options: ['Oui', 'Non'] },
      ],
    },
    {
      title: 'Introduction à l’agritech et aux capteurs connectés',
      description: 'Découvrez comment les capteurs et la collecte de données peuvent améliorer les rendements et réduire les coûts.',
      location: 'Tunis',
      offsetDays: 8,
      participants: 28,
      questions: [
        { label: 'Filière concernée', type: 'TEXT' as const, required: true },
      ],
    },
    {
      title: 'Conduite de serre et lutte intégrée',
      description: 'Programme appliqué sur la gestion climatique des serres, la fertilisation et la lutte biologique.',
      location: 'Tunis',
      offsetDays: -9,
      participants: 36,
      questions: [
        { label: 'Culture sous serre', type: 'TEXT' as const, required: true },
      ],
    },
    {
      title: 'Planification de projet pour centres de formation ruraux',
      description: 'Session de cadrage pour structurer une offre de formation, un calendrier et un suivi des participants.',
      location: 'Sfax',
      offsetDays: 30,
      participants: 19,
      questions: [
        { label: 'Nom du centre', type: 'TEXT' as const, required: true },
      ],
    },
  ];

  for (let i = 0; i < formationTemplates.length; i += 1) {
    const template = formationTemplates[i]!;
    const center = trainingCenters[i % trainingCenters.length]!.user;

    await Formation.create({
      specialistId: center._id,
      title: template.title,
      description: template.description,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(slug(template.title))}/1200/900.jpg`,
      formationDate: daysFromNow(template.offsetDays),
      location: template.location,
      organizer: `${center.profile.firstName} ${center.profile.lastName}`.trim(),
      allowParticipation: true,
      participationFormEnabled: true,
      participationFormQuestions: template.questions.map((q, index) => ({
        id: `q_${i}_${index}`,
        label: q.label,
        type: q.type,
        required: q.required,
        options: q.options || [],
      })),
      stats: { participants: template.participants },
      isActive: true,
    });
  }

  console.log(`✅ Created ${formationTemplates.length} training center formations`);

  // ─── Supplier Events ────────────────────────────────────────
  const eventTemplates = [
    {
      title: 'Journée portes ouvertes semences & irrigation',
      description: 'Rencontrez les équipes commerciales, découvrez les nouveautés et assistez aux démonstrations produits.',
      offsetDays: 6,
      participants: 74,
    },
    {
      title: 'Atelier santé animale et nutrition',
      description: 'Rencontre technique autour des solutions vétérinaires et des compléments de nutrition animale.',
      offsetDays: 14,
      participants: 58,
    },
    {
      title: 'Salon terrain équipements & irrigation',
      description: 'Démonstrations pratiques de matériel agricole, pompes, goutte à goutte et accessoires de parcelle.',
      offsetDays: 24,
      participants: 91,
    },
    {
      title: 'Rencontre B2B protection des cultures',
      description: 'Présentations de solutions anti-parasitaires et échanges sur les bonnes pratiques de traitement.',
      offsetDays: -4,
      participants: 46,
    },
    {
      title: 'Forum élevage & alimentation animale',
      description: 'Un rendez-vous dédié aux éleveurs autour de la nutrition, des suppléments et de la performance.',
      offsetDays: 18,
      participants: 63,
    },
  ];

  for (let i = 0; i < eventTemplates.length; i += 1) {
    const template = eventTemplates[i]!;
    const supplier = suppliers[i % suppliers.length]!.supplier;
    const companyName = suppliers[i % suppliers.length]!.supplier.companyName;

    await Event.create({
      supplierId: supplier._id,
      title: template.title,
      description: template.description,
      imageUrl: `https://picsum.photos/seed/${encodeURIComponent(slug(template.title))}/1200/900.jpg`,
      eventDate: daysFromNow(template.offsetDays),
      organizer: companyName,
      allowParticipation: true,
      participationFormEnabled: true,
      participationFormQuestions: [
        { id: `e_q_${i}_0`, label: 'Nom complet', type: 'TEXT', required: true, options: [] },
        { id: `e_q_${i}_1`, label: 'Téléphone', type: 'TEXT', required: true, options: [] },
      ],
      stats: { participants: template.participants },
      isActive: true,
    });
  }

  console.log(`✅ Created ${eventTemplates.length} supplier events`);

  // ─── Agricultural & Animal Care Products ────────────────────
  const agriProducts = [
    // Seeds
    { name: 'Semences Blé Tendre Vitron (25kg)', category: catCereals, tags: ['blé', 'semence', 'céréale'], retailPrice: 15000, bulkPrice: 11000 },
    { name: 'Semences Orge Saïda 183 (25kg)', category: catCereals, tags: ['orge', 'semence', 'fourrager'], retailPrice: 12000, bulkPrice: 9000 },
    { name: 'Semences Laitue Buttercrunch (500g)', category: catVegetables, tags: ['laitue', 'semence', 'légume'], retailPrice: 3500, bulkPrice: 2500 },
    { name: 'Semences Tomate San Marzano (800g)', category: catVegetables, tags: ['tomate', 'semence', 'légume'], retailPrice: 8000, bulkPrice: 5500 },
    
    // Fertilizers & Amendments
    { name: 'Engrais NPK 15-15-15 (50kg)', category: catFertilizers, tags: ['engrais', 'NPK', 'chimique'], retailPrice: 8500, bulkPrice: 6500 },
    { name: 'Engrais NPK 10-20-20 Spécial Fruit (50kg)', category: catFertilizers, tags: ['engrais', 'fruit', 'potassium'], retailPrice: 9000, bulkPrice: 7000 },
    { name: 'Compost Organique Premium (1000kg)', category: catSoilAmendments, tags: ['compost', 'organique', 'bio'], retailPrice: 35000, bulkPrice: 28000 },
    { name: 'Tourbe de Sphaigne (200L)', category: catSoilAmendments, tags: ['tourbe', 'amendement', 'sol'], retailPrice: 12000, bulkPrice: 9500 },
    { name: 'Chaux Agricole (50kg)', category: catSoilAmendments, tags: ['chaux', 'pH', 'sol'], retailPrice: 2000, bulkPrice: 1400 },
    
    // Crop Protection
    { name: 'Fongicide Bordeaux 80% (1kg)', category: catFungicides, tags: ['fongicide', 'protection', 'plante'], retailPrice: 4500, bulkPrice: 3200 },
    { name: 'Insecticide Biologique Spinosad (100ml)', category: catPesticides, tags: ['insecticide', 'bio', 'ravageurs'], retailPrice: 6000, bulkPrice: 4500 },
    { name: 'Herbicide Sélectif CéréaClean (5L)', category: catPesticides, tags: ['herbicide', 'céréale', 'désherbage'], retailPrice: 18000, bulkPrice: 14000 },
    
    // Livestock Feed
    { name: 'Aliment Concentré Bovins Laitiers (50kg)', category: catAnimalFeed, tags: ['aliment', 'lait', 'bovin'], retailPrice: 22000, bulkPrice: 18000 },
    { name: 'Granulés Maïs Fourrage (50kg)', category: catAnimalFeed, tags: ['maïs', 'fourrage', 'animal'], retailPrice: 5500, bulkPrice: 4200 },
    { name: 'Aliment Poule Pondeuse (25kg)', category: catAnimalFeed, tags: ['poule', 'ponte', 'volaille'], retailPrice: 8000, bulkPrice: 6500 },
    { name: 'Foin Méditerranéen Qualité Premium (Bottes)', category: catAnimalFeed, tags: ['foin', 'fourrage', 'herbivore'], retailPrice: 1500, bulkPrice: 1200 },
    
    // Veterinary & Supplements
    { name: 'Antibiotique Vétérinaire Amoxicilline 150ml', category: catVetMedicines, tags: ['antibiotique', 'vet', 'santé'], retailPrice: 3500, bulkPrice: 2800 },
    { name: 'Vitamines & Minéraux Bovin Poudre (500g)', category: catSupplements, tags: ['vitamines', 'minéraux', 'santé'], retailPrice: 5000, bulkPrice: 3800 },
    { name: 'Probiotiques Ruminants (1kg)', category: catSupplements, tags: ['probiotiques', 'digestion', 'animal'], retailPrice: 8500, bulkPrice: 6800 },
    { name: 'Sel Minéralisé Bloc 20kg', category: catSupplements, tags: ['sel', 'minéraux', 'bovin'], retailPrice: 2200, bulkPrice: 1700 },
    
    // Equipment (some tools and supplies)
    { name: 'Système Irrigation Goutte à Goutte 500m', category: catIrrigation, tags: ['irrigation', 'goutte', 'économie-eau'], retailPrice: 45000, bulkPrice: 36000 },
    { name: 'Motopompe Agricole 6.5HP', category: catFarmEquip, tags: ['pompe', 'eau', 'irrigation'], retailPrice: 85000, bulkPrice: 68000 },
    { name: 'Pulvérisateur Dorsal 16L', category: catFarmEquip, tags: ['pulvérisateur', 'traitement', 'chimie'], retailPrice: 12000, bulkPrice: 9500 },
  ];

  let productCount = 0;

  // Create products for all suppliers
  for (let i = 0; i < suppliers.length; i++) {
    const { supplier } = suppliers[i]!;
    
    // Each supplier gets 4-5 products
    const productsForSupplier = agriProducts.slice(i * 4, i * 4 + 4);
    
    for (const p of productsForSupplier) {
      const productSlug = slug(`${p.name}-${supplier.companyName}-${productCount}`);
      await Product.create({
        supplierId: supplier._id,
        categoryId: p.category._id,
        categoryPath: p.category.ancestors
          ? [...p.category.ancestors, { _id: p.category._id, name: p.category.name, slug: p.category.slug }]
          : [{ _id: p.category._id, name: p.category.name, slug: p.category.slug }],
        name: p.name,
        slug: productSlug,
        description: `<p>Produit agricole de qualité supérieure fourni par ${supplier.companyName}. Adapté aux conditions méditerranéennes et aux besoins des agriculteurs tunisiens.</p><p>Certification complète et conformité aux normes internationales. Excellent rapport qualité-prix.</p>`,
        status: 'ACTIVE',
        sector: 'AGRICULTURAL',
        tags: p.tags,
        isFeatured: productCount % 6 === 0,
        priceVisibility: 'PUBLIC',
        variants: [
          {
            name: p.name.includes('kg') || p.name.includes('L') ? 'Standard' : 'Default',
            sku: `AGR-${supplier.slug.substring(0, 3).toUpperCase()}-${productCount}`,
            stockQty: Math.floor(Math.random() * 500) + 50,
            reservedQty: 0,
            unit: 'UNIT',
            pricing: { retailPrice: p.retailPrice, bulkPrice: p.bulkPrice, minBulkQty: 5, currency: 'TND' },
          },
        ],
        attributes: [
          { key: 'Origine', value: 'Tunisia', unit: '' },
          { key: 'Catégorie', value: p.category.name, unit: '' },
          { key: 'Saison', value: 'Automne-Hiver', unit: '' },
        ],
        supplierSnapshot: {
          name: supplier.companyName,
          slug: supplier.slug,
          isVerified: supplier.isVerified,
          rating: supplier.stats.averageRating,
        },
        stats: {
          views: Math.floor(Math.random() * 400) + 20,
          addToCart: Math.floor(Math.random() * 50) + 5,
          totalOrders: Math.floor(Math.random() * 40) + 5,
          rating: +(3.5 + Math.random() * 1.5).toFixed(1),
          reviewCount: Math.floor(Math.random() * 25) + 3,
        },
      });
      productCount++;
    }
  }

  console.log(`✅ Created ${productCount} agricultural & animal care products`);

  // ─── Specialist Consultations & Reviews ──────────────────────
  const consultationRequests = [
    {
      peasantId: buyerFree._id,
      engineerId: specialists[0]!.user._id,
      speciality: 'Agronomist',
      title: 'Problème rendement blé - solution engrais NPK',
      description: 'Mes plants de blé ne poussent pas bien. Quels NPK utiliser pour améliorer le rendement?',
      status: 'RESOLVED' as const,
      engineerRecommendation: 'Utilisez NPK 10-20-20 spécialisé pour céréales. Appliquez 2 fois par saison à 2 semaines d\'intervalle. Arroser bien avant.',
      feedback: { stars: 5, comment: 'Conseils très utiles, rendement augmenté de 30%' },
    },
    {
      peasantId: buyerPrime._id,
      engineerId: specialists[1]!.user._id,
      speciality: 'Veterinarian',
      title: 'Maladie respiratoire bovins',
      description: 'Mes vaches ont une toux persistante. Comment traiter et prévenir?',
      status: 'RESOLVED' as const,
      engineerRecommendation: 'Administrez Amoxicilline 150ml IM pendant 5 jours. Améliorer la ventilation de l\'étable et la qualité du foin.',
      feedback: { stars: 5, comment: 'Traitement efficace, vaches rétablies en 1 semaine' },
    },
    {
      peasantId: buyerFree._id,
      engineerId: specialists[2]!.user._id,
      speciality: 'Pest Management Specialist',
      title: 'Infestation pucerons tomates',
      description: 'Pucerons massifs sur mes tomates. Traitement bio possible?',
      status: 'RESOLVED' as const,
      engineerRecommendation: 'Pulvérisez Spinosad 100ml dilué. Répétez tous les 7 jours. Bio-friendly et très efficace contre pucerons.',
      feedback: { stars: 4, comment: 'Pucerons disparus, tomates sauvées!' },
    },
    {
      peasantId: buyerPrime._id,
      engineerId: specialists[3]!.user._id,
      speciality: 'Soil Scientist',
      title: 'Analyse sol et recommandations',
      description: 'Mes sols sont acides. Comment corriger le pH pour légumes?',
      status: 'RESOLVED' as const,
      engineerRecommendation: 'Épandez 2T/hectare de chaux agricole. Retestez pH après 2 mois. Le pH idéal pour légumes est 6-7.',
      feedback: { stars: 5, comment: 'Analyse détaillée et très professionnelle' },
    },
    {
      peasantId: buyerFree._id,
      engineerId: specialists[4]!.user._id,
      speciality: 'Animal Nutritionist',
      title: 'Nutrition optimal vaches laitières',
      description: 'Aliments pour augmenter production lait?',
      status: 'RESOLVED' as const,
      engineerRecommendation: 'Concentré lait 50kg + foin qualité. Vitamines et minéraux quotidiens. Distribution 2x/jour régulièrement.',
      feedback: { stars: 5, comment: 'Production lait augmentée de 25%' },
    },
    {
      peasantId: buyerPrime._id,
      engineerId: specialists[5]!.user._id,
      speciality: 'Horticulturist',
      title: 'Culture serres tomates biologiques',
      description: 'Comment démarrer culture tomate bio en serre?',
      status: 'RESOLVED' as const,
      engineerRecommendation: 'Substrat bio (compost + tourbe). Irrigation goutte. Pollinisation manuelle. Température 20-25°C optimal.',
      feedback: { stars: 5, comment: 'Conseils excellent, première récolte parfaite!' },
    },
  ];

  for (const req of consultationRequests) {
    await AgriHelpRequest.create({
      peasantId: req.peasantId,
      engineerId: req.engineerId,
      speciality: req.speciality,
      title: req.title,
      description: req.description,
      imageUrls: [],
      status: req.status,
      discussion: [],
      engineerRecommendation: req.engineerRecommendation,
      feedback: req.feedback,
    });
  }

  console.log(`✅ Created ${consultationRequests.length} specialist consultations with reviews`);

  // ─── Summary ────────────────────────────────────────────────
  console.log('\n📊 Seed Summary:');
  console.log(`   Users: ${await User.countDocuments()}`);
  console.log(`   Specialists: ${specialists.length}`);
  console.log(`   Suppliers: ${await Supplier.countDocuments()}`);
  console.log(`   Categories: ${await Category.countDocuments()}`);
  console.log(`   Products: ${await Product.countDocuments()}`);
  console.log(`   Plans: ${await SubscriptionPlan.countDocuments()}`);
  console.log(`   Specialist Consultations: ${await AgriHelpRequest.countDocuments()}`);
  console.log('\n🔑 Test Accounts:');
  console.log('   Admin:       admin@tunagri.dz / Admin@2025!');
  console.log('   Buyer FREE:  buyer@tunagri.dz / Buyer@2025!');
  console.log('   Buyer PRIME: buyer.prime@tunagri.dz / BuyerPrime@2025!');
  console.log('\n👨‍💼 Specialist Accounts (Premium):');
  specialistData.forEach((s) => {
    console.log(`   ${s.speciality.padEnd(30)} ${s.email} / Specialist@2025!`);
  });
  console.log('\n🏫 Training Center Accounts:');
  trainingCenterData.forEach((c) => {
    console.log(`   ${c.centerName.padEnd(30)} ${c.email} / ${c.password}`);
  });
  console.log('\n🏢 Supplier Accounts:');
  supplierData.slice(0, 3).forEach((s) => {
    console.log(`   ${s.company.padEnd(30)} ${s.email} / Supplier@2025!`);
  });
  console.log(`   ... and ${supplierData.length - 3} more suppliers`);

  await disconnectDB();
  console.log('\n✅ Seed complete!');
}

seed().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
