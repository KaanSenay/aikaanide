/**
 * Comment Formatter Utility
 * Düzgün comment formatı sağlar
 */

export class CommentFormatter {
  /**
   * Verilen kodu analiz eder ve comment'leri düzeltir
   * @param {string} code - Düzeltilecek kod
   * @returns {string} Düzeltilmiş kod
   */
  static formatComments(code) {
    let formatted = code;

    // 1. // ile başlayan comment'lerde boşluk ekle
    // Yanlış: //comment
    // Doğru: // comment
    formatted = formatted.replace(/\/\/([^\s\/])/g, '// $1');

    // 2. Inline comment'lerde önce boşluk ekle
    // Yanlış: code;//comment
    // Doğru: code; // comment
    formatted = formatted.replace(/([^\s])\/\//g, '$1 //');

    // 3. Multi-line comment'lerde * hizalama
    // /** ile başlayan comment'leri düzelt
    formatted = this.formatMultiLineComments(formatted);

    return formatted;
  }

  /**
   * Multi-line comment'leri düzeltir
   * @param {string} code - Kod
   * @returns {string} Düzeltilmiş kod
   */
  static formatMultiLineComments(code) {
    const lines = code.split('\n');
    const result = [];
    let inMultiLineComment = false;
    let commentIndent = 0;

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];
      const trimmed = line.trim();

      // Multi-line comment başlangıcı
      if (trimmed.startsWith('/**') || trimmed.startsWith('/*')) {
        inMultiLineComment = true;
        commentIndent = line.indexOf(trimmed);
        result.push(line);
        continue;
      }

      // Multi-line comment içinde
      if (inMultiLineComment) {
        if (trimmed.startsWith('*/')) {
          // Comment bitişi
          inMultiLineComment = false;
          result.push(' '.repeat(commentIndent) + ' */');
          continue;
        } else if (trimmed.startsWith('*')) {
          // Comment satırı - hizalama yap
          const content = trimmed.substring(1).trim();
          result.push(' '.repeat(commentIndent) + ' * ' + content);
          continue;
        }
      }

      result.push(line);
    }

    return result.join('\n');
  }

  /**
   * JSDoc comment oluşturur
   * @param {string} functionName - Fonksiyon adı
   * @param {Array} params - Parametreler [{name, type, description}]
   * @param {Object} returns - Return bilgisi {type, description}
   * @param {string} description - Fonksiyon açıklaması
   * @param {number} indent - Girinti seviyesi
   * @returns {string} JSDoc comment
   */
  static createJSDoc(functionName, params = [], returns = null, description = '', indent = 0) {
    const indentStr = ' '.repeat(indent);
    let jsdoc = `${indentStr}/**\n`;
    
    if (description) {
      jsdoc += `${indentStr} * ${description}\n`;
    }
    
    if (params.length > 0) {
      if (description) jsdoc += `${indentStr} *\n`;
      params.forEach(param => {
        jsdoc += `${indentStr} * @param {${param.type || 'any'}} ${param.name}`;
        if (param.description) {
          jsdoc += ` - ${param.description}`;
        }
        jsdoc += '\n';
      });
    }
    
    if (returns) {
      if (params.length > 0 || description) jsdoc += `${indentStr} *\n`;
      jsdoc += `${indentStr} * @returns {${returns.type || 'any'}}`;
      if (returns.description) {
        jsdoc += ` ${returns.description}`;
      }
      jsdoc += '\n';
    }
    
    jsdoc += `${indentStr} */\n`;
    return jsdoc;
  }

  /**
   * Kod bloğuna comment ekler
   * @param {string} code - Kod
   * @param {string} comment - Eklenecek comment
   * @param {number} lineNumber - Satır numarası (0-indexed)
   * @param {boolean} inline - Inline comment mi?
   * @returns {string} Comment eklenmiş kod
   */
  static addComment(code, comment, lineNumber, inline = false) {
    const lines = code.split('\n');
    
    if (lineNumber < 0 || lineNumber >= lines.length) {
      return code;
    }

    if (inline) {
      // Inline comment ekle
      lines[lineNumber] = lines[lineNumber].trimEnd() + ' // ' + comment;
    } else {
      // Satır üstüne comment ekle
      const indent = lines[lineNumber].match(/^\s*/)[0];
      lines.splice(lineNumber, 0, indent + '// ' + comment);
    }

    return lines.join('\n');
  }

  /**
   * Comment'leri temizler (kaldırır)
   * @param {string} code - Kod
   * @param {boolean} keepJSDoc - JSDoc comment'leri koru
   * @returns {string} Comment'siz kod
   */
  static removeComments(code, keepJSDoc = true) {
    let result = code;

    if (!keepJSDoc) {
      // Tüm multi-line comment'leri kaldır
      result = result.replace(/\/\*[\s\S]*?\*\//g, '');
    } else {
      // Sadece JSDoc olmayanları kaldır
      result = result.replace(/\/\*(?!\*)[\s\S]*?\*\//g, '');
    }

    // Single-line comment'leri kaldır
    result = result.replace(/\/\/.*$/gm, '');

    return result;
  }

  /**
   * Comment'lerin doğru formatta olup olmadığını kontrol eder
   * @param {string} code - Kontrol edilecek kod
   * @returns {Array} Hata listesi
   */
  static validateComments(code) {
    const errors = [];
    const lines = code.split('\n');

    lines.forEach((line, index) => {
      const trimmed = line.trim();

      // Yanlış format: //comment (boşluk yok)
      if (/\/\/[^\s\/]/.test(line)) {
        errors.push({
          line: index + 1,
          message: 'Comment after // should have a space',
          fix: line.replace(/\/\/([^\s\/])/, '// $1')
        });
      }

      // Yanlış format: code;//comment (önce boşluk yok)
      if (/[^\s]\/\//.test(line) && !line.includes('http://') && !line.includes('https://')) {
        errors.push({
          line: index + 1,
          message: 'Space required before //',
          fix: line.replace(/([^\s])\/\//, '$1 //')
        });
      }
    });

    return errors;
  }
}
