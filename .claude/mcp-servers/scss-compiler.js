#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { exec } from 'child_process';
import { promisify } from 'util';
import { readFile, writeFile, mkdir } from 'fs/promises';
import { join, dirname, basename, extname } from 'path';
import { existsSync } from 'fs';

const execAsync = promisify(exec);

class SCSSCompilerServer {
  constructor() {
    this.server = new Server(
      {
        name: 'scss-compiler',
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
          name: 'compile_scss',
          description: 'Compile SCSS/Sass code to CSS',
          inputSchema: {
            type: 'object',
            properties: {
              scss: {
                type: 'string',
                description: 'SCSS code to compile',
              },
              file_path: {
                type: 'string',
                description: 'Path to SCSS file to compile',
              },
              output_path: {
                type: 'string',
                description: 'Output path for compiled CSS (optional)',
              },
              options: {
                type: 'object',
                description: 'Compilation options',
                properties: {
                  style: {
                    type: 'string',
                    enum: ['expanded', 'compressed'],
                    description: 'Output style (expanded or compressed)',
                  },
                  source_map: {
                    type: 'boolean',
                    description: 'Generate source map',
                  },
                },
              },
            },
            required: [],
          },
        },
        {
          name: 'watch_scss',
          description: 'Watch SCSS files for changes and auto-compile',
          inputSchema: {
            type: 'object',
            properties: {
              input_dir: {
                type: 'string',
                description: 'Directory to watch for SCSS files',
              },
              output_dir: {
                type: 'string',
                description: 'Output directory for compiled CSS',
              },
              options: {
                type: 'object',
                description: 'Watch options',
                properties: {
                  recursive: {
                    type: 'boolean',
                    description: 'Watch recursively',
                  },
                  style: {
                    type: 'string',
                    enum: ['expanded', 'compressed'],
                    description: 'Output style',
                  },
                },
              },
            },
            required: ['input_dir', 'output_dir'],
          },
        },
        {
          name: 'analyze_scss',
          description: 'Analyze SCSS code for potential issues and optimizations',
          inputSchema: {
            type: 'object',
            properties: {
              scss: {
                type: 'string',
                description: 'SCSS code to analyze',
              },
              file_path: {
                type: 'string',
                description: 'Path to SCSS file to analyze',
              },
            },
            required: [],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'compile_scss':
            return await this.compileSCSS(args);
          case 'watch_scss':
            return await this.watchSCSS(args);
          case 'analyze_scss':
            return await this.analyzeSCSS(args);
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

  async compileSCSS(args) {
    try {
      const { scss, file_path, output_path, options = {} } = args;
      let scssContent;
      let inputFile;

      if (file_path) {
        if (!existsSync(file_path)) {
          throw new Error(`SCSS file not found: ${file_path}`);
        }
        scssContent = await readFile(file_path, 'utf-8');
        inputFile = file_path;
      } else if (scss) {
        // Créer un fichier temporaire
        inputFile = join(process.cwd(), '.temp-input.scss');
        await writeFile(inputFile, scss);
        scssContent = scss;
      } else {
        throw new Error('Either scss or file_path must be provided');
      }

      // Installer sass si nécessaire
      try {
        await execAsync('npm list sass --depth=0 2>/dev/null || npm install sass --no-save');
      } catch (installError) {
        console.error('Installing sass...');
      }

      // Déterminer le fichier de sortie
      let outputFile;
      if (output_path) {
        outputFile = output_path;
      } else if (file_path) {
        const dir = dirname(file_path);
        const name = basename(file_path, extname(file_path));
        outputFile = join(dir, `${name}.css`);
      } else {
        outputFile = join(process.cwd(), '.temp-output.css');
      }

      // Créer le répertoire de sortie si nécessaire
      const outputDir = dirname(outputFile);
      if (!existsSync(outputDir)) {
        await mkdir(outputDir, { recursive: true });
      }

      // Options de compilation
      const style = options.style || 'expanded';
      const sourceMap = options.source_map ? '--source-map' : '--no-source-map';

      // Compiler avec sass
      const command = `npx sass "${inputFile}" "${outputFile}" --style=${style} ${sourceMap}`;
      const { stdout, stderr } = await execAsync(command);

      // Lire le résultat
      const compiledCSS = await readFile(outputFile, 'utf-8');

      // Nettoyer les fichiers temporaires
      if (!file_path) {
        await execAsync(`rm -f "${inputFile}"`).catch(() => {});
      }
      if (!output_path) {
        await execAsync(`rm -f "${outputFile}"`).catch(() => {});
      }

      let result = `✅ SCSS Compilation Successful\\n\\n`;
      result += `📁 Input: ${file_path || 'inline SCSS'}\\n`;
      result += `📄 Output: ${output_path || 'inline CSS'}\\n`;
      result += `🎨 Style: ${style}\\n`;
      result += `🗺️ Source Map: ${options.source_map ? 'Yes' : 'No'}\\n\\n`;
      
      if (!output_path) {
        result += `📝 Compiled CSS:\\n\\n\`\`\`css\\n${compiledCSS}\\n\`\`\`\\n`;
      }

      if (stderr && stderr.trim()) {
        result += `\\n⚠️ Warnings:\\n${stderr}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `SCSS Compilation Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async watchSCSS(args) {
    try {
      const { input_dir, output_dir, options = {} } = args;

      if (!existsSync(input_dir)) {
        throw new Error(`Input directory not found: ${input_dir}`);
      }

      // Créer le répertoire de sortie si nécessaire
      if (!existsSync(output_dir)) {
        await mkdir(output_dir, { recursive: true });
      }

      const style = options.style || 'expanded';
      const recursive = options.recursive !== false ? '--watch' : '';
      
      // Lancer le watch avec sass
      const command = `npx sass ${recursive} "${input_dir}:${output_dir}" --style=${style}`;
      
      // Note: Cette commande reste en cours d'exécution
      const result = `🔍 SCSS Watch Started\\n\\n`;
      result += `📂 Watching: ${input_dir}\\n`;
      result += `📁 Output: ${output_dir}\\n`;
      result += `🎨 Style: ${style}\\n`;
      result += `🔄 Recursive: ${options.recursive !== false}\\n\\n`;
      result += `⚡ Sass is now watching for changes...\\n`;
      result += `💡 To stop watching, use Ctrl+C in the terminal where this command is running.\\n\\n`;
      result += `Command: ${command}`;

      // Démarrer en arrière-plan
      execAsync(command).catch(() => {
        // Le watch peut être interrompu, c'est normal
      });

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `SCSS Watch Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async analyzeSCSS(args) {
    try {
      const { scss, file_path } = args;
      let scssContent;

      if (file_path) {
        scssContent = await readFile(file_path, 'utf-8');
      } else if (scss) {
        scssContent = scss;
      } else {
        throw new Error('Either scss or file_path must be provided');
      }

      // Analyse basique du code SCSS
      const analysis = {
        lines: scssContent.split('\\n').length,
        variables: (scssContent.match(/\$[\w-]+/g) || []).length,
        mixins: (scssContent.match(/@mixin\s+[\w-]+/g) || []).length,
        functions: (scssContent.match(/@function\s+[\w-]+/g) || []).length,
        imports: (scssContent.match(/@import|@use/g) || []).length,
        nesting_levels: this.calculateNestingLevels(scssContent),
        color_values: (scssContent.match(/#[0-9a-fA-F]{3,6}|rgb\(|rgba\(|hsl\(|hsla\(/g) || []).length,
      };

      // Suggestions d'optimisation
      const suggestions = [];
      
      if (analysis.nesting_levels > 4) {
        suggestions.push('🔄 Consider reducing nesting levels (max 3-4 recommended)');
      }
      
      if (analysis.variables === 0 && analysis.lines > 20) {
        suggestions.push('📝 Consider using SCSS variables for repeated values');
      }
      
      if (scssContent.includes('!important')) {
        suggestions.push('⚠️ Avoid using !important when possible');
      }
      
      if (analysis.color_values > 5 && analysis.variables === 0) {
        suggestions.push('🎨 Consider using color variables for consistency');
      }

      let result = `📊 SCSS Analysis Results\\n\\n`;
      result += `📏 Lines: ${analysis.lines}\\n`;
      result += `💲 Variables: ${analysis.variables}\\n`;
      result += `🔧 Mixins: ${analysis.mixins}\\n`;
      result += `⚡ Functions: ${analysis.functions}\\n`;
      result += `📥 Imports: ${analysis.imports}\\n`;
      result += `🏗️ Max Nesting Level: ${analysis.nesting_levels}\\n`;
      result += `🎨 Color Values: ${analysis.color_values}\\n\\n`;
      
      if (suggestions.length > 0) {
        result += `💡 Suggestions:\\n`;
        suggestions.forEach(suggestion => {
          result += `   ${suggestion}\\n`;
        });
      } else {
        result += `✅ No major issues found!`;
      }

      return {
        content: [
          {
            type: 'text',
            text: result,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `SCSS Analysis Error: ${error.message}`,
          },
        ],
      };
    }
  }

  calculateNestingLevels(scss) {
    const lines = scss.split('\\n');
    let maxLevel = 0;
    let currentLevel = 0;
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      if (trimmed.includes('{')) {
        currentLevel++;
        maxLevel = Math.max(maxLevel, currentLevel);
      }
      
      if (trimmed.includes('}')) {
        currentLevel = Math.max(0, currentLevel - 1);
      }
    }
    
    return maxLevel;
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('SCSS Compiler MCP server running on stdio');
  }
}

const server = new SCSSCompilerServer();
server.run().catch(console.error);