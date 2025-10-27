export class ProjectAnalyzer {
  constructor() {
    this.projectCache = {
      functions: new Map(),
      classes: new Map(),
      variables: new Map(),
      imports: new Map(),
      exports: new Map(),
      lastScan: null
    };
    this.scanInterval = 30000; // 30 saniyede bir yenile
  }

  async analyzeProject(currentFilePath) {
    // Cache'i kontrol et
    if (this.projectCache.lastScan && 
        Date.now() - this.projectCache.lastScan < this.scanInterval) {
      console.log("[ProjectAnalyzer] Using cached project data");
      return this.buildContextString(currentFilePath);
    }

    console.log("[ProjectAnalyzer] Deep scanning project...");
    
    try {
      // Mevcut dosyanın dizinini al
      const dirPath = currentFilePath.substring(0, currentFilePath.lastIndexOf('/'));

      // Dizini RECURSIVE tara ve sadece kod dosyalarını al
      const codeFiles = await this.listCodeFilesRecursively(dirPath);
      console.log(`[ProjectAnalyzer] Found ${codeFiles.length} code files`);

      // Dosyaları analiz et
      let analyzedCount = 0;
      for (const file of codeFiles) {
        try {
          const content = await window.api.readFile(file.path);
          this.analyzeFile(file.path, content);
          analyzedCount++;
        } catch (err) {
          console.warn(`[ProjectAnalyzer] Could not read ${file.path}:`, err);
        }
      }

      this.projectCache.lastScan = Date.now();
      console.log(`[ProjectAnalyzer] Deep scan complete - analyzed ${analyzedCount} files`);
      console.log(`[ProjectAnalyzer] Found: ${this.projectCache.functions.size} functions, ${this.projectCache.classes.size} classes, ${this.projectCache.variables.size} variables`);
      
      return this.buildContextString(currentFilePath);
    } catch (error) {
      console.error("[ProjectAnalyzer] Error scanning project:", error);
      return "";
    }
  }

  async listCodeFilesRecursively(rootDir) {
    const stack = [rootDir];
    const results = [];
    const isCode = (p) => p.endsWith('.js') || p.endsWith('.jsx') || p.endsWith('.ts') || p.endsWith('.tsx');

    while (stack.length) {
      const dir = stack.pop();
      let entries = [];
      try {
        entries = await window.api.listFiles(dir);
      } catch (err) {
        console.warn(`[ProjectAnalyzer] Cannot list ${dir}:`, err);
        continue;
      }
      for (const e of entries) {
        if (!e || !e.name) continue;
        if (e.name === 'node_modules' || e.name === '.git' || e.name.startsWith('.')) continue;
        if (e.isDir) {
          stack.push(e.path);
        } else if (isCode(e.path)) {
          results.push(e);
        }
      }
    }
    return results;
  }

  analyzeFile(filePath, content) {
    const fileName = filePath.split('/').pop();

    // 1. Function declarations - DAHA DETAYLI
    // Regular functions
    const regularFuncs = content.matchAll(/function\s+(\w+)\s*\(([^)]*)\)/g);
    for (const match of regularFuncs) {
      const [, name, params] = match;
      this.projectCache.functions.set(name, {
        file: fileName,
        params: params.trim(),
        fullPath: filePath,
        type: 'function'
      });
    }

    // Arrow functions
    const arrowFuncs = content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s*)?\(([^)]*)\)\s*=>/g);
    for (const match of arrowFuncs) {
      const [, name, params] = match;
      this.projectCache.functions.set(name, {
        file: fileName,
        params: params.trim(),
        fullPath: filePath,
        type: 'arrow'
      });
    }

    // Async functions
    const asyncFuncs = content.matchAll(/async\s+function\s+(\w+)\s*\(([^)]*)\)/g);
    for (const match of asyncFuncs) {
      const [, name, params] = match;
      this.projectCache.functions.set(name, {
        file: fileName,
        params: params.trim(),
        fullPath: filePath,
        type: 'async'
      });
    }

    // 2. Class declarations - DAHA DETAYLI
    const classMatches = content.matchAll(/class\s+(\w+)(?:\s+extends\s+(\w+))?\s*\{([^}]*)\}/gs);
    for (const match of classMatches) {
      const [, name, parent, body] = match;
      
      // Class metodlarını çıkar
      const methods = [];
      const methodMatches = body.matchAll(/(?:async\s+)?(\w+)\s*\(([^)]*)\)/g);
      for (const methodMatch of methodMatches) {
        const [, methodName, methodParams] = methodMatch;
        if (methodName !== 'constructor') {
          methods.push(`${methodName}(${methodParams.trim()})`);
        }
      }
      
      this.projectCache.classes.set(name, {
        file: fileName,
        parent: parent || null,
        methods: methods,
        fullPath: filePath
      });
    }

    // 3. Variable declarations - TÜM TİPLER
    const varMatches = content.matchAll(/(?:const|let|var)\s+(\w+)\s*=\s*([^;,\n]+)/g);
    for (const match of varMatches) {
      const [, name, value] = match;
      // Değer tipini tahmin et
      let valueType = 'unknown';
      if (value.includes('[')) valueType = 'array';
      else if (value.includes('{')) valueType = 'object';
      else if (value.includes('new ')) valueType = 'instance';
      else if (value.includes('(')) valueType = 'function';
      else if (!isNaN(value.trim())) valueType = 'number';
      else if (value.includes('"') || value.includes("'")) valueType = 'string';
      
      this.projectCache.variables.set(name, {
        file: fileName,
        valueType: valueType,
        fullPath: filePath
      });
    }

    // 4. Import statements - DETAYLI
    const importMatches = content.matchAll(/import\s+(?:\{([^}]+)\}|(\w+))\s+from\s+['"]([^'"]+)['"]/g);
    for (const match of importMatches) {
      const [, namedImports, defaultImport, source] = match;
      const imports = namedImports ? namedImports.split(',').map(s => s.trim()) : [defaultImport];
      imports.forEach(imp => {
        if (imp) {
          this.projectCache.imports.set(imp, {
            file: fileName,
            source: source,
            fullPath: filePath,
            isDefault: !!defaultImport
          });
        }
      });
    }

    // 5. Export statements - DETAYLI
    const exportMatches = content.matchAll(/export\s+(?:default\s+)?(?:class|function|const|let|var)\s+(\w+)/g);
    for (const match of exportMatches) {
      const [, name] = match;
      this.projectCache.exports.set(name, {
        file: fileName,
        fullPath: filePath
      });
    }

    // 6. Object methods - YENİ
    const objectMethods = content.matchAll(/(\w+)\s*:\s*(?:async\s+)?function\s*\(([^)]*)\)/g);
    for (const match of objectMethods) {
      const [, name, params] = match;
      this.projectCache.functions.set(name, {
        file: fileName,
        params: params.trim(),
        fullPath: filePath,
        type: 'method'
      });
    }
  }

  buildContextString(currentFilePath) {
    const context = [];

    // Functions - DAHA FAZLA göster
    if (this.projectCache.functions.size > 0) {
      const funcs = Array.from(this.projectCache.functions.entries())
        .slice(0, 30) // 15 -> 30 (daha fazla fonksiyon)
        .map(([name, info]) => `${name}(${info.params}) [${info.file}]`)
        .join(', ');
      context.push(`Available functions: ${funcs}`);
    }

    // Classes - DAHA FAZLA göster
    if (this.projectCache.classes.size > 0) {
      const classes = Array.from(this.projectCache.classes.entries())
        .slice(0, 20) // 10 -> 20
        .map(([name, info]) => `${name}${info.parent ? ` extends ${info.parent}` : ''} [${info.file}]`)
        .join(', ');
      context.push(`Available classes: ${classes}`);
    }

    // Variables - DAHA FAZLA göster
    if (this.projectCache.variables.size > 0) {
      const vars = Array.from(this.projectCache.variables.entries())
        .slice(0, 40) // 20 -> 40
        .map(([name, info]) => `${name} [${info.file}]`)
        .join(', ');
      context.push(`Available variables: ${vars}`);
    }

    // Imports - DAHA FAZLA göster
    if (this.projectCache.imports.size > 0) {
      const imports = Array.from(this.projectCache.imports.entries())
        .slice(0, 20) // 10 -> 20
        .map(([name, info]) => `${name} from '${info.source}'`)
        .join(', ');
      context.push(`Imported modules: ${imports}`);
    }

    // Exports - YENİ
    if (this.projectCache.exports.size > 0) {
      const exports = Array.from(this.projectCache.exports.entries())
        .slice(0, 20)
        .map(([name, info]) => `${name} [${info.file}]`)
        .join(', ');
      context.push(`Exported items: ${exports}`);
    }

    // İstatistikler
    context.push(`\nProject stats: ${this.projectCache.functions.size} functions, ${this.projectCache.classes.size} classes, ${this.projectCache.variables.size} variables`);

    return context.join('\n');
  }

  // Belirli bir isim için öneri al
  getSuggestions(prefix, type = 'all') {
    const suggestions = [];

    if (type === 'all' || type === 'function') {
      for (const [name, info] of this.projectCache.functions.entries()) {
        if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.push({
            type: 'function',
            name: name,
            params: info.params,
            file: info.file
          });
        }
      }
    }

    if (type === 'all' || type === 'class') {
      for (const [name, info] of this.projectCache.classes.entries()) {
        if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.push({
            type: 'class',
            name: name,
            file: info.file
          });
        }
      }
    }

    if (type === 'all' || type === 'variable') {
      for (const [name, info] of this.projectCache.variables.entries()) {
        if (name.toLowerCase().startsWith(prefix.toLowerCase())) {
          suggestions.push({
            type: 'variable',
            name: name,
            file: info.file
          });
        }
      }
    }

    return suggestions.slice(0, 5); // En fazla 5 öneri
  }

  clearCache() {
    this.projectCache = {
      functions: new Map(),
      classes: new Map(),
      variables: new Map(),
      imports: new Map(),
      exports: new Map(),
      lastScan: null
    };
    console.log("[ProjectAnalyzer] Cache cleared");
  }
}
