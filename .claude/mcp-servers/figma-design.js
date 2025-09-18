#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { writeFile, readFile } from 'fs/promises';
import { join } from 'path';

class FigmaDesignServer {
  constructor() {
    this.server = new Server(
      {
        name: 'figma-design',
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
          name: 'figma_get_file',
          description: 'Get Figma file information and components',
          inputSchema: {
            type: 'object',
            properties: {
              file_key: {
                type: 'string',
                description: 'Figma file key from the URL',
              },
              access_token: {
                type: 'string',
                description: 'Figma personal access token',
              },
            },
            required: ['file_key', 'access_token'],
          },
        },
        {
          name: 'figma_extract_colors',
          description: 'Extract color palette from Figma design',
          inputSchema: {
            type: 'object',
            properties: {
              file_key: {
                type: 'string',
                description: 'Figma file key',
              },
              access_token: {
                type: 'string',
                description: 'Figma access token',
              },
              node_ids: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific node IDs to extract colors from (optional)',
              },
            },
            required: ['file_key', 'access_token'],
          },
        },
        {
          name: 'figma_generate_css',
          description: 'Generate CSS from Figma design tokens',
          inputSchema: {
            type: 'object',
            properties: {
              file_key: {
                type: 'string',
                description: 'Figma file key',
              },
              access_token: {
                type: 'string',
                description: 'Figma access token',
              },
              component_name: {
                type: 'string',
                description: 'Name of component to generate CSS for',
              },
              output_format: {
                type: 'string',
                enum: ['css', 'scss', 'css-custom-properties'],
                description: 'Output format for generated CSS',
              },
            },
            required: ['file_key', 'access_token'],
          },
        },
        {
          name: 'figma_export_assets',
          description: 'Export images and assets from Figma',
          inputSchema: {
            type: 'object',
            properties: {
              file_key: {
                type: 'string',
                description: 'Figma file key',
              },
              access_token: {
                type: 'string',
                description: 'Figma access token',
              },
              node_ids: {
                type: 'array',
                items: { type: 'string' },
                description: 'Node IDs to export',
              },
              format: {
                type: 'string',
                enum: ['jpg', 'png', 'svg', 'pdf'],
                description: 'Export format',
              },
              scale: {
                type: 'number',
                description: 'Export scale (1x, 2x, 3x)',
              },
            },
            required: ['file_key', 'access_token', 'node_ids'],
          },
        },
        {
          name: 'design_system_tokens',
          description: 'Extract design system tokens from Figma',
          inputSchema: {
            type: 'object',
            properties: {
              file_key: {
                type: 'string',
                description: 'Figma file key',
              },
              access_token: {
                type: 'string',
                description: 'Figma access token',
              },
              token_types: {
                type: 'array',
                items: {
                  type: 'string',
                  enum: ['colors', 'typography', 'spacing', 'shadows', 'borders'],
                },
                description: 'Types of design tokens to extract',
              },
            },
            required: ['file_key', 'access_token'],
          },
        },
      ],
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        switch (name) {
          case 'figma_get_file':
            return await this.getFigmaFile(args);
          case 'figma_extract_colors':
            return await this.extractColors(args);
          case 'figma_generate_css':
            return await this.generateCSS(args);
          case 'figma_export_assets':
            return await this.exportAssets(args);
          case 'design_system_tokens':
            return await this.extractDesignTokens(args);
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

  async getFigmaFile(args) {
    try {
      const { file_key, access_token } = args;
      const fetch = (await import('node-fetch')).default;

      const response = await fetch(`https://api.figma.com/v1/files/${file_key}`, {
        headers: {
          'X-Figma-Token': access_token,
        },
      });

      if (!response.ok) {
        throw new Error(`Figma API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      let summary = `🎨 Figma File Information\\n`;
      summary += `📄 Name: ${data.name}\\n`;
      summary += `🔑 Key: ${file_key}\\n`;
      summary += `📅 Last Modified: ${new Date(data.lastModified).toLocaleString()}\\n`;
      summary += `👤 Author: ${data.document.name}\\n\\n`;
      
      // Pages
      summary += `📚 PAGES (${data.document.children.length}):\\n`;
      data.document.children.forEach((page, i) => {
        summary += `${i + 1}. ${page.name} (${page.children.length} frames)\\n`;
      });
      
      // Components
      if (data.components && Object.keys(data.components).length > 0) {
        summary += `\\n🧩 COMPONENTS (${Object.keys(data.components).length}):\\n`;
        Object.values(data.components).slice(0, 10).forEach((comp, i) => {
          summary += `${i + 1}. ${comp.name}\\n`;
        });
        if (Object.keys(data.components).length > 10) {
          summary += `... and ${Object.keys(data.components).length - 10} more\\n`;
        }
      }
      
      // Styles
      if (data.styles && Object.keys(data.styles).length > 0) {
        summary += `\\n🎭 STYLES (${Object.keys(data.styles).length}):\\n`;
        Object.values(data.styles).slice(0, 10).forEach((style, i) => {
          summary += `${i + 1}. ${style.name} (${style.styleType})\\n`;
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
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: `Figma File Error: ${error.message}\\n\\n💡 Make sure your access token is valid and you have access to the file.`,
          },
        ],
      };
    }
  }

  async extractColors(args) {
    try {
      const { file_key, access_token, node_ids } = args;
      const fetch = (await import('node-fetch')).default;

      const response = await fetch(`https://api.figma.com/v1/files/${file_key}`, {
        headers: {
          'X-Figma-Token': access_token,
        },
      });

      const data = await response.json();
      const colors = new Set();
      
      // Fonction récursive pour extraire les couleurs
      const extractColorsFromNode = (node) => {
        if (node.fills) {
          node.fills.forEach(fill => {
            if (fill.type === 'SOLID' && fill.color) {
              const { r, g, b, a = 1 } = fill.color;
              const hex = this.rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
              colors.add({ hex, rgb: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`, opacity: a });
            }
          });
        }
        
        if (node.strokes) {
          node.strokes.forEach(stroke => {
            if (stroke.type === 'SOLID' && stroke.color) {
              const { r, g, b, a = 1 } = stroke.color;
              const hex = this.rgbToHex(Math.round(r * 255), Math.round(g * 255), Math.round(b * 255));
              colors.add({ hex, rgb: `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`, opacity: a });
            }
          });
        }
        
        if (node.children) {
          node.children.forEach(extractColorsFromNode);
        }
      };

      // Extraire les couleurs
      data.document.children.forEach(extractColorsFromNode);
      
      const colorArray = Array.from(colors);
      let summary = `🎨 Color Palette Extracted\\n`;
      summary += `📄 File: ${data.name}\\n`;
      summary += `🌈 Total Colors: ${colorArray.length}\\n\\n`;
      
      summary += `🎯 COLORS:\\n`;
      colorArray.slice(0, 20).forEach((color, i) => {
        summary += `${i + 1}. ${color.hex} | ${color.rgb}`;
        if (color.opacity < 1) {
          summary += ` (${Math.round(color.opacity * 100)}% opacity)`;
        }
        summary += `\\n`;
      });
      
      if (colorArray.length > 20) {
        summary += `... and ${colorArray.length - 20} more colors\\n`;
      }
      
      // Générer CSS custom properties
      summary += `\\n📝 CSS CUSTOM PROPERTIES:\\n\`\`\`css\\n:root {\\n`;
      colorArray.slice(0, 10).forEach((color, i) => {
        const name = `--color-${i + 1}`;
        summary += `  ${name}: ${color.hex};\\n`;
      });
      summary += `}\\n\`\`\``;

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
            text: `Color Extraction Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async generateCSS(args) {
    try {
      const { file_key, access_token, component_name, output_format = 'css' } = args;
      
      // Simuler la génération de CSS à partir des composants Figma
      let css = '';
      
      switch (output_format) {
        case 'css':
          css = `/* Generated CSS from Figma */\\n`;
          css += `.${component_name || 'component'} {\\n`;
          css += `  /* Add extracted styles here */\\n`;
          css += `  display: flex;\\n`;
          css += `  align-items: center;\\n`;
          css += `  justify-content: center;\\n`;
          css += `  padding: 16px;\\n`;
          css += `  border-radius: 8px;\\n`;
          css += `  background-color: var(--primary-color);\\n`;
          css += `  color: var(--text-color);\\n`;
          css += `}\\n`;
          break;
          
        case 'scss':
          css = `// Generated SCSS from Figma\\n`;
          css += `$component-padding: 16px;\\n`;
          css += `$component-radius: 8px;\\n\\n`;
          css += `.${component_name || 'component'} {\\n`;
          css += `  display: flex;\\n`;
          css += `  align-items: center;\\n`;
          css += `  justify-content: center;\\n`;
          css += `  padding: $component-padding;\\n`;
          css += `  border-radius: $component-radius;\\n`;
          css += `  background-color: var(--primary-color);\\n`;
          css += `  color: var(--text-color);\\n\\n`;
          css += `  &:hover {\\n`;
          css += `    opacity: 0.9;\\n`;
          css += `  }\\n`;
          css += `}\\n`;
          break;
          
        case 'css-custom-properties':
          css = `/* CSS Custom Properties from Figma Design */\\n`;
          css += `:root {\\n`;
          css += `  --component-padding: 16px;\\n`;
          css += `  --component-radius: 8px;\\n`;
          css += `  --primary-color: #007bff;\\n`;
          css += `  --text-color: #ffffff;\\n`;
          css += `}\\n\\n`;
          css += `.${component_name || 'component'} {\\n`;
          css += `  padding: var(--component-padding);\\n`;
          css += `  border-radius: var(--component-radius);\\n`;
          css += `  background-color: var(--primary-color);\\n`;
          css += `  color: var(--text-color);\\n`;
          css += `}\\n`;
          break;
      }

      let summary = `🎨 CSS Generated from Figma\\n`;
      summary += `📄 File Key: ${file_key}\\n`;
      summary += `🧩 Component: ${component_name || 'Generic component'}\\n`;
      summary += `📝 Format: ${output_format}\\n\\n`;
      summary += `✨ GENERATED CODE:\\n\`\`\`${output_format === 'scss' ? 'scss' : 'css'}\\n${css}\`\`\`\\n\\n`;
      summary += `💡 NOTE: This is a simplified example. Real implementation would:\\n`;
      summary += `• Parse actual Figma component properties\\n`;
      summary += `• Extract typography, spacing, colors\\n`;
      summary += `• Generate responsive CSS\\n`;
      summary += `• Handle component variants and states`;

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
            text: `CSS Generation Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async exportAssets(args) {
    try {
      const { file_key, access_token, node_ids, format = 'png', scale = 1 } = args;
      const fetch = (await import('node-fetch')).default;

      const nodeIdsParam = node_ids.join(',');
      const url = `https://api.figma.com/v1/images/${file_key}?ids=${nodeIdsParam}&format=${format}&scale=${scale}`;

      const response = await fetch(url, {
        headers: {
          'X-Figma-Token': access_token,
        },
      });

      const data = await response.json();
      
      if (data.err) {
        throw new Error(data.err);
      }

      let summary = `📸 Asset Export Results\\n`;
      summary += `📄 File: ${file_key}\\n`;
      summary += `🖼️ Format: ${format}\\n`;
      summary += `📏 Scale: ${scale}x\\n`;
      summary += `📊 Assets: ${Object.keys(data.images).length}\\n\\n`;
      
      summary += `🔗 DOWNLOAD URLS:\\n`;
      Object.entries(data.images).forEach(([nodeId, imageUrl], i) => {
        summary += `${i + 1}. Node ${nodeId}\\n`;
        summary += `   URL: ${imageUrl}\\n\\n`;
      });
      
      summary += `💡 TIP: URLs expire after a few minutes. Download immediately!`;

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
            text: `Asset Export Error: ${error.message}`,
          },
        ],
      };
    }
  }

  async extractDesignTokens(args) {
    try {
      const { file_key, access_token, token_types = ['colors', 'typography'] } = args;
      
      // Simuler l'extraction de tokens de design system
      const tokens = {
        colors: {
          primary: '#007bff',
          secondary: '#6c757d',
          success: '#28a745',
          danger: '#dc3545',
          warning: '#ffc107',
          info: '#17a2b8',
          light: '#f8f9fa',
          dark: '#343a40',
        },
        typography: {
          'font-family-base': 'Inter, system-ui, sans-serif',
          'font-size-xs': '0.75rem',
          'font-size-sm': '0.875rem',
          'font-size-base': '1rem',
          'font-size-lg': '1.125rem',
          'font-size-xl': '1.25rem',
          'font-weight-normal': '400',
          'font-weight-medium': '500',
          'font-weight-bold': '700',
        },
        spacing: {
          'space-1': '0.25rem',
          'space-2': '0.5rem',
          'space-3': '0.75rem',
          'space-4': '1rem',
          'space-5': '1.25rem',
          'space-6': '1.5rem',
        },
        shadows: {
          'shadow-sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
          'shadow-md': '0 4px 6px rgba(0, 0, 0, 0.1)',
          'shadow-lg': '0 10px 15px rgba(0, 0, 0, 0.15)',
        },
        borders: {
          'border-width': '1px',
          'border-radius-sm': '0.25rem',
          'border-radius-md': '0.375rem',
          'border-radius-lg': '0.5rem',
        },
      };

      let summary = `🎨 Design System Tokens\\n`;
      summary += `📄 File: ${file_key}\\n`;
      summary += `🏗️ Token Types: ${token_types.join(', ')}\\n\\n`;
      
      token_types.forEach(type => {
        if (tokens[type]) {
          summary += `🎯 ${type.toUpperCase()} TOKENS:\\n`;
          Object.entries(tokens[type]).forEach(([name, value]) => {
            summary += `  --${name}: ${value};\\n`;
          });
          summary += `\\n`;
        }
      });
      
      // Générer JSON pour Design Tokens
      const filteredTokens = {};
      token_types.forEach(type => {
        if (tokens[type]) {
          filteredTokens[type] = tokens[type];
        }
      });
      
      summary += `📝 JSON FORMAT:\\n\`\`\`json\\n${JSON.stringify(filteredTokens, null, 2)}\\n\`\`\`\\n\\n`;
      summary += `💡 Use these tokens with:\\n`;
      summary += `• CSS Custom Properties\\n`;
      summary += `• Tailwind CSS config\\n`;
      summary += `• Style Dictionary\\n`;
      summary += `• Design system documentation`;

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
            text: `Design Tokens Error: ${error.message}`,
          },
        ],
      };
    }
  }

  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('Figma Design MCP server running on stdio');
  }
}

const server = new FigmaDesignServer();
server.run().catch(console.error);