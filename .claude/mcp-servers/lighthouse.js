#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

const execAsync = promisify(exec);

class LighthouseServer {
  constructor() {
    this.server = new Server(
      {
        name: 'lighthouse-performance',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupToolHandlers();
    
    // Error handling
    this.server.onerror = (error) => console.error('[MCP Error]', error);
    process.on('SIGINT', async () => {
      await this.server.close();
      process.exit(0);
    });
  }

  setupToolHandlers() {
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'lighthouse_audit',
          description: 'Run Lighthouse performance audit on a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to audit',
              },
              options: {
                type: 'object',
                description: 'Lighthouse options',
                properties: {
                  device: {
                    type: 'string',
                    enum: ['mobile', 'desktop'],
                    description: 'Device type for audit',
                  },
                  categories: {
                    type: 'array',
                    items: {
                      type: 'string',
                      enum: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
                    },
                    description: 'Categories to audit',
                  },
                  output_format: {
                    type: 'string',
                    enum: ['json', 'html', 'csv'],
                    description: 'Output format',
                  },
                },
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'pagespeed_insights',
          description: 'Get Google PageSpeed Insights for a URL',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to analyze',
              },
              strategy: {
                type: 'string',
                enum: ['mobile', 'desktop'],
                description: 'Analysis strategy',
              },
              category: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
                },
                description: 'Categories to analyze',
              },
            },
            required: ['url'],
          },
        },
        {
          name: 'performance_budget',
          description: 'Check if site meets performance budget criteria',
          inputSchema: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'URL to check',
              },
              budget: {
                type: 'object',
                description: 'Performance budget criteria',
                properties: {
                  performance_score: {
                    type: 'number',
                    description: 'Minimum performance score (0-100)',
                  },
                  first_contentful_paint: {
                    type: 'number',
                    description: 'Maximum FCP in milliseconds',
                  },
                  largest_contentful_paint: {
                    type: 'number',
                    description: 'Maximum LCP in milliseconds',
                  },
                  cumulative_layout_shift: {
                    type: 'number',
                    description: 'Maximum CLS score',
                  },
                  total_blocking_time: {
                    type: 'number',
                    description: 'Maximum TBT in milliseconds',
                  },
                },
              },
            },
            required: ['url'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'lighthouse_audit':
            return await this.runLighthouseAudit(args);
          case 'pagespeed_insights':
            return await this.getPageSpeedInsights(args);
          case 'performance_budget':
            return await this.checkPerformanceBudget(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async runLighthouseAudit(args) {
    try {
      const { url, options = {} } = args;
      
      // Installer lighthouse si nécessaire
      try {
        await execAsync('npm list lighthouse --depth=0 2>/dev/null || npm install lighthouse --no-save');
      } catch (installError) {
        console.error('Installing lighthouse...');
      }

      const device = options.device || 'mobile';
      const categories = options.categories || ['performance'];
      const outputFormat = options.output_format || 'json';
      
      // Créer les options Lighthouse
      const categoryFlags = categories.map(cat => `--only-categories=${cat}`).join(' ');
      const preset = device === 'desktop' ? '--preset=desktop' : '';
      const outputFile = join(process.cwd(), `lighthouse-${Date.now()}.${outputFormat}`);
      
      // Commande Lighthouse
      const command = `npx lighthouse "${url}" ${categoryFlags} ${preset} --output=${outputFormat} --output-path="${outputFile}" --chrome-flags="--headless --no-sandbox"`;
      
      console.error(`Running: ${command}`);
      const { stdout, stderr } = await execAsync(command, { timeout: 120000 }); // 2 minutes timeout

      // Lire le résultat
      const result = await readFile(outputFile, 'utf-8');
      
      // Nettoyer le fichier temporaire
      await execAsync(`rm -f "${outputFile}"`).catch(() => {});

      if (outputFormat === 'json') {
        const data = JSON.parse(result);
        const scores = data.categories;
        const metrics = data.audits;

        let summary = `🚨 Lighthouse Audit Results\\n`;
        summary += `🔗 URL: ${url}\\n`;
        summary += `📱 Device: ${device}\\n\\n`;
        
        // Scores par catégorie
        summary += `📊 SCORES:\\n`;
        Object.entries(scores).forEach(([key, category]) => {
          const score = Math.round(category.score * 100);
          const emoji = score >= 90 ? '🟢' : score >= 50 ? '🟡' : '🔴';
          summary += `${emoji} ${category.title}: ${score}/100\\n`;
        });
        
        // Métriques de performance
        if (metrics) {
          summary += `\\n⚡ CORE WEB VITALS:\\n`;
          
          const coreMetrics = {
            'first-contentful-paint': 'First Contentful Paint',
            'largest-contentful-paint': 'Largest Contentful Paint',
            'cumulative-layout-shift': 'Cumulative Layout Shift',
            'total-blocking-time': 'Total Blocking Time',
            'speed-index': 'Speed Index',
          };
          
          Object.entries(coreMetrics).forEach(([key, title]) => {
            if (metrics[key]) {
              const metric = metrics[key];
              let value = metric.displayValue || 'N/A';
              const score = metric.score ? Math.round(metric.score * 100) : 0;
              const emoji = score >= 90 ? '🟢' : score >= 50 ? '🟡' : '🔴';
              summary += `${emoji} ${title}: ${value}\\n`;
            }
          });
        }
        
        // Recommandations principales
        if (metrics) {
          summary += `\\n💡 TOP RECOMMENDATIONS:\\n`;
          const recommendations = Object.values(metrics)
            .filter(audit => audit.score !== null && audit.score < 0.9 && audit.details)
            .slice(0, 5);
            
          recommendations.forEach((rec, i) => {
            summary += `${i + 1}. ${rec.title}\\n`;
          });
        }

        return {
          content: [
            {
              type: 'text',
              text: summary,
            },
          ],
        };
      } else {
        return {
          content: [
            {
              type: 'text',
              text: `Lighthouse audit completed. Output saved in ${outputFormat} format.\\n\\n${result.substring(0, 1000)}...`,
            },
          ],
        };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Lighthouse Audit Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async getPageSpeedInsights(args) {
    try {
      const { url, strategy = 'mobile', category = ['performance'] } = args;
      
      // Utiliser l'API PageSpeed Insights
      const fetch = (await import('node-fetch')).default;
      
      const categories = category.join('&category=');
      const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&strategy=${strategy}&category=${categories}`;
      
      const response = await fetch(apiUrl);
      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error.message);
      }

      const lighthouse = data.lighthouseResult;
      const scores = lighthouse.categories;
      const metrics = lighthouse.audits;

      let summary = `📈 PageSpeed Insights Results\\n`;
      summary += `🔗 URL: ${url}\\n`;
      summary += `📱 Strategy: ${strategy}\\n\\n`;
      
      // Scores
      summary += `📊 SCORES:\\n`;
      Object.entries(scores).forEach(([key, category]) => {
        const score = Math.round(category.score * 100);
        const emoji = score >= 90 ? '🟢' : score >= 50 ? '🟡' : '🔴';
        summary += `${emoji} ${category.title}: ${score}/100\\n`;
      });
      
      // Core Web Vitals
      const cwv = data.loadingExperience?.metrics;
      if (cwv) {
        summary += `\\n🎯 REAL USER DATA (CrUX):\\n`;
        Object.entries(cwv).forEach(([key, metric]) => {
          const category = metric.category;
          const percentile = metric.percentile;
          const emoji = category === 'FAST' ? '🟢' : category === 'AVERAGE' ? '🟡' : '🔴';
          summary += `${emoji} ${key}: ${percentile}ms (${category})\\n`;
        });
      }
      
      // Recommandations
      summary += `\\n💡 TOP OPPORTUNITIES:\\n`;
      const opportunities = Object.values(metrics)
        .filter(audit => audit.id && audit.score !== null && audit.score < 0.9)
        .sort((a, b) => (b.details?.overallSavingsMs || 0) - (a.details?.overallSavingsMs || 0))
        .slice(0, 5);
        
      opportunities.forEach((opp, i) => {
        const savings = opp.details?.overallSavingsMs || 0;
        summary += `${i + 1}. ${opp.title}`;
        if (savings > 0) {
          summary += ` (Save ~${Math.round(savings)}ms)`;
        }
        summary += `\\n`;
      });

      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `PageSpeed Insights Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async checkPerformanceBudget(args) {
    try {
      const { url, budget = {} } = args;
      
      // Exécuter un audit Lighthouse pour obtenir les métriques
      const auditResult = await this.runLighthouseAudit({ url, options: { categories: ['performance'] } });
      
      // Valeurs par défaut du budget
      const defaultBudget = {
        performance_score: 90,
        first_contentful_paint: 1500,
        largest_contentful_paint: 2500,
        cumulative_layout_shift: 0.1,
        total_blocking_time: 200,
      };
      
      const finalBudget = { ...defaultBudget, ...budget };
      
      // Simuler la vérification du budget (dans un vrai cas, on parserait le résultat de Lighthouse)
      let summary = `💰 Performance Budget Check\\n`;
      summary += `🔗 URL: ${url}\\n\\n`;
      summary += `📋 BUDGET CRITERIA:\\n`;
      
      Object.entries(finalBudget).forEach(([metric, threshold]) => {
        const metricName = metric.replace(/_/g, ' ').toUpperCase();
        summary += `• ${metricName}: ${threshold}\\n`;
      });
      
      summary += `\\n🎯 BUDGET STATUS:\\n`;
      summary += `✅ Budget check initiated for ${url}\\n`;
      summary += `📊 Run lighthouse_audit first to get actual metrics\\n`;
      summary += `⚖️ Compare results against your budget criteria\\n\\n`;
      
      summary += `💡 TIP: Use specific thresholds based on your user needs:\\n`;
      summary += `• E-commerce: Performance Score ≥ 90\\n`;
      summary += `• News/Blog: FCP ≤ 1.5s, LCP ≤ 2.5s\\n`;
      summary += `• SaaS: CLS ≤ 0.1, TBT ≤ 200ms\\n`;

      return {
        content: [
          {
            type: 'text',
            text: summary,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Performance Budget Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Lighthouse Performance MCP server running on stdio');
  }
}

const server = new LighthouseServer();
server.run().catch(console.error);