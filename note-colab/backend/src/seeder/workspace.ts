/**
 * Seeder script: Creates workspaces with 100+ pages each
 * Run: ts-node seed.ts
 */

import { Page } from '@/models/pages';
import { CommonStatus, IWorkspace, Workspace } from '@/models/wrokspace';
import mongoose from 'mongoose';
import { env } from '@/config/env';

/**
 * Generate random page content
 */
function generatePageContent(index: number): string {
  const templates = [
    `Meeting notes from Q${Math.ceil(index / 25)} planning session`,
    `Project documentation for feature #${index}`,
    `Technical specification for module ${index}`,
    `User research findings - Sprint ${index}`,
    `Design mockups and wireframes v${index}`,
    `API documentation - Endpoint ${index}`,
    `Bug report analysis #${index}`,
    `Performance optimization notes ${index}`,
    `Database schema updates - Version ${index}`,
    `Marketing campaign ideas ${index}`,
  ];

  return templates[index % templates.length];
}

/**
 * Generate random page title
 */
function generatePageTitle(workspaceName: string, index: number): string {
  const prefixes = [
    'Sprint Planning',
    'Tech Spec',
    'Meeting Notes',
    'Project Brief',
    'Design System',
    'API Docs',
    'User Story',
    'Research',
    'Architecture',
    'Roadmap',
  ];

  return `${prefixes[index % prefixes.length]} - ${workspaceName} #${index + 1}`;
}

/**
 * Seed database with workspaces and pages
 */
async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Workspace.deleteMany({});
    await Page.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Create workspaces
    const workspaces = [
      {
        title: 'Engineering Team',
        description: 'Technical documentation and project specs',
        status: CommonStatus.ACTIVE,
      },
      {
        title: 'Product Management',
        description: 'Product roadmaps and user research',
        status: CommonStatus.ACTIVE,
      },
      {
        title: 'Design System',
        description: 'UI components and design guidelines',
        status: CommonStatus.ACTIVE,
      },
      {
        title: 'Marketing Campaigns',
        description: 'Campaign planning and analytics',
        status: CommonStatus.ACTIVE,
      },
      {
        title: 'Customer Support',
        description: 'Support tickets and documentation',
        status: CommonStatus.INACTIVE,
      },
    ];

    const createdWorkspaces: IWorkspace[] = [];

    // Create each workspace with pages
    for (const workspaceData of workspaces) {
      const workspace = await Workspace.create(workspaceData);
      createdWorkspaces.push(workspace);

      console.log(`\n📁 Created workspace: ${workspace.title}`);

      // Determine number of pages (100-150 random)
      const pageCount = Math.floor(Math.random() * 51) + 100; // 100-150 pages

      // Bulk create pages for performance
      const pages = [];
      for (let i = 0; i < pageCount; i++) {
        pages.push({
          title: generatePageTitle(workspace.title, i),
          content: generatePageContent(i),
          workspaceId: workspace._id,
          status: i % 10 === 0 ? CommonStatus.INACTIVE : CommonStatus.ACTIVE, // 10% inactive
        });
      }

      // Insert pages in bulk (faster than individual creates)
      await Page.insertMany(pages);
      console.log(`   └─ Created ${pageCount} pages`);
    }

    // Summary stats
    console.log('\n📊 Seeding Summary:');
    console.log(`   Workspaces: ${createdWorkspaces.length}`);

    for (const workspace of createdWorkspaces) {
      const count = await Page.countDocuments({ workspaceId: workspace._id });
      console.log(`   └─ ${workspace.title}: ${count} pages`);
    }

    const totalPages = await Page.countDocuments();
    console.log(`\n✅ Total pages created: ${totalPages}`);

    // Display sample workspace for testing
    const sampleWorkspace = createdWorkspaces[0];
    console.log(`\n🧪 Test cascade delete with:`);
    console.log(`   Workspace ID: ${sampleWorkspace._id}`);
    console.log(`   DELETE /api/workspaces/${sampleWorkspace._id}`);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

/**
 * Run seeder
 */
seedDatabase();
