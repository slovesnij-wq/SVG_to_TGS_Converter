import pako from 'pako';

const MIN_SCALE_MULTIPLIER = 0.1;
const MAX_SCALE_MULTIPLIER = 1;

export interface LottieShape {
  ty: string;
  nm?: string;
  it: any[];
}

export interface LottieLayer {
  ddd: number;
  ind: number;
  ty: number;
  nm: string;
  sr: number;
  ks: any;
  ao: number;
  shapes: LottieShape[];
  ip: number;
  op: number;
  st: number;
  bm: number;
}

export interface LottieAnimation {
  v: string;
  fr: number;
  ip: number;
  op: number;
  w: number;
  h: number;
  nm: string;
  ddd: number;
  assets: any[];
  layers: LottieLayer[];
}

const safeNum = (n: number): number => {
  if (isNaN(n) || !isFinite(n)) return 0;
  return Math.round(n * 1000) / 1000;
};

const clampScaleMultiplier = (value: number): number => {
  if (!isFinite(value)) return 1;
  return Math.min(MAX_SCALE_MULTIPLIER, Math.max(MIN_SCALE_MULTIPLIER, value));
};

/**
 * Simple SVG path parser and converter to Lottie format.
 */
export function svgPathToLottie(d: string) {
  const paths: { i: [number, number][], o: [number, number][], v: [number, number][], c: boolean }[] = [];
  let currentPath: { i: [number, number][], o: [number, number][], v: [number, number][], c: boolean } | null = null;

  const commandRegex = /([a-df-z])([^a-df-z]*)/gi;
  let match;
  
  let currentPos = { x: 0, y: 0 };
  let startPos = { x: 0, y: 0 };
  let lastControlPoint = { x: 0, y: 0 };
  let lastCommand = '';

  while ((match = commandRegex.exec(d)) !== null) {
    const type = match[1];
    const argsStr = match[2].trim();
    const args = argsStr.match(/-?\d*\.?\d+(?:[eE][-+]?\d+)?/g)?.map(Number) || [];

    const isRelative = type === type.toLowerCase();
    const cmd = type.toUpperCase();

    if (cmd === 'M') {
      if (currentPath && currentPath.v.length > 0) paths.push(currentPath);
      currentPath = { i: [], o: [], v: [], c: false };
    }

    if (!currentPath) currentPath = { i: [], o: [], v: [], c: false };

    switch (cmd) {
      case 'M':
        for (let i = 0; i < args.length; i += 2) {
          if (isRelative) { currentPos.x += args[i]; currentPos.y += args[i+1]; }
          else { currentPos.x = args[i]; currentPos.y = args[i+1]; }
          if (i === 0) {
            startPos = { ...currentPos };
            currentPath.v.push([safeNum(currentPos.x), safeNum(currentPos.y)]);
            currentPath.i.push([0, 0]);
            currentPath.o.push([0, 0]);
          } else {
            currentPath.v.push([safeNum(currentPos.x), safeNum(currentPos.y)]);
            currentPath.i.push([0, 0]);
            currentPath.o.push([0, 0]);
          }
          lastControlPoint = { ...currentPos };
        }
        break;
      case 'L':
        for (let i = 0; i < args.length; i += 2) {
          if (isRelative) { currentPos.x += args[i]; currentPos.y += args[i+1]; }
          else { currentPos.x = args[i]; currentPos.y = args[i+1]; }
          currentPath.v.push([safeNum(currentPos.x), safeNum(currentPos.y)]);
          currentPath.i.push([0, 0]);
          currentPath.o.push([0, 0]);
          lastControlPoint = { ...currentPos };
        }
        break;
      case 'H':
        for (let i = 0; i < args.length; i++) {
          if (isRelative) currentPos.x += args[i];
          else currentPos.x = args[i];
          currentPath.v.push([safeNum(currentPos.x), safeNum(currentPos.y)]);
          currentPath.i.push([0, 0]);
          currentPath.o.push([0, 0]);
          lastControlPoint = { ...currentPos };
        }
        break;
      case 'V':
        for (let i = 0; i < args.length; i++) {
          if (isRelative) currentPos.y += args[i];
          else currentPos.y = args[i];
          currentPath.v.push([safeNum(currentPos.x), safeNum(currentPos.y)]);
          currentPath.i.push([0, 0]);
          currentPath.o.push([0, 0]);
          lastControlPoint = { ...currentPos };
        }
        break;
      case 'C':
        for (let i = 0; i < args.length; i += 6) {
          const x1 = isRelative ? currentPos.x + args[i] : args[i];
          const y1 = isRelative ? currentPos.y + args[i+1] : args[i+1];
          const x2 = isRelative ? currentPos.x + args[i+2] : args[i+2];
          const y2 = isRelative ? currentPos.y + args[i+3] : args[i+3];
          const x = isRelative ? currentPos.x + args[i+4] : args[i+4];
          const y = isRelative ? currentPos.y + args[i+5] : args[i+5];
          
          if (currentPath.v.length > 0) {
            const prevIdx = currentPath.v.length - 1;
            const prevV = currentPath.v[prevIdx];
            currentPath.o[prevIdx] = [safeNum(x1 - prevV[0]), safeNum(y1 - prevV[1])];
          }
          currentPath.v.push([safeNum(x), safeNum(y)]);
          currentPath.i.push([safeNum(x2 - x), safeNum(y2 - y)]);
          currentPath.o.push([0, 0]);
          currentPos = { x, y };
          lastControlPoint = { x: x2, y: y2 };
        }
        break;
      case 'S':
        for (let i = 0; i < args.length; i += 4) {
          let x1, y1;
          if (lastCommand === 'C' || lastCommand === 'S') {
            x1 = currentPos.x + (currentPos.x - lastControlPoint.x);
            y1 = currentPos.y + (currentPos.y - lastControlPoint.y);
          } else {
            x1 = currentPos.x;
            y1 = currentPos.y;
          }
          const x2 = isRelative ? currentPos.x + args[i] : args[i];
          const y2 = isRelative ? currentPos.y + args[i+1] : args[i+1];
          const x = isRelative ? currentPos.x + args[i+2] : args[i+2];
          const y = isRelative ? currentPos.y + args[i+3] : args[i+3];

          if (currentPath.v.length > 0) {
            const prevIdx = currentPath.v.length - 1;
            const prevV = currentPath.v[prevIdx];
            currentPath.o[prevIdx] = [safeNum(x1 - prevV[0]), safeNum(y1 - prevV[1])];
          }
          currentPath.v.push([safeNum(x), safeNum(y)]);
          currentPath.i.push([safeNum(x2 - x), safeNum(y2 - y)]);
          currentPath.o.push([0, 0]);
          currentPos = { x, y };
          lastControlPoint = { x: x2, y: y2 };
        }
        break;
      case 'Q':
        for (let i = 0; i < args.length; i += 4) {
          const x1 = isRelative ? currentPos.x + args[i] : args[i];
          const y1 = isRelative ? currentPos.y + args[i+1] : args[i+1];
          const x = isRelative ? currentPos.x + args[i+2] : args[i+2];
          const y = isRelative ? currentPos.y + args[i+3] : args[i+3];
          
          const cx1 = currentPos.x + (2/3) * (x1 - currentPos.x);
          const cy1 = currentPos.y + (2/3) * (y1 - currentPos.y);
          const cx2 = x + (2/3) * (x1 - x);
          const cy2 = y + (2/3) * (y1 - y);

          if (currentPath.v.length > 0) {
            const prevIdx = currentPath.v.length - 1;
            const prevV = currentPath.v[prevIdx];
            currentPath.o[prevIdx] = [safeNum(cx1 - prevV[0]), safeNum(cy1 - prevV[1])];
          }
          currentPath.v.push([safeNum(x), safeNum(y)]);
          currentPath.i.push([safeNum(cx2 - x), safeNum(cy2 - y)]);
          currentPath.o.push([0, 0]);
          currentPos = { x, y };
          lastControlPoint = { x: x1, y: y1 };
        }
        break;
      case 'T':
        for (let i = 0; i < args.length; i += 2) {
          let x1, y1;
          if (lastCommand === 'Q' || lastCommand === 'T') {
            x1 = currentPos.x + (currentPos.x - lastControlPoint.x);
            y1 = currentPos.y + (currentPos.y - lastControlPoint.y);
          } else {
            x1 = currentPos.x;
            y1 = currentPos.y;
          }
          const x = isRelative ? currentPos.x + args[i] : args[i];
          const y = isRelative ? currentPos.y + args[i+1] : args[i+1];
          
          const cx1 = currentPos.x + (2/3) * (x1 - currentPos.x);
          const cy1 = currentPos.y + (2/3) * (y1 - currentPos.y);
          const cx2 = x + (2/3) * (x1 - x);
          const cy2 = y + (2/3) * (y1 - y);

          if (currentPath.v.length > 0) {
            const prevIdx = currentPath.v.length - 1;
            const prevV = currentPath.v[prevIdx];
            currentPath.o[prevIdx] = [safeNum(cx1 - prevV[0]), safeNum(cy1 - prevV[1])];
          }
          currentPath.v.push([safeNum(x), safeNum(y)]);
          currentPath.i.push([safeNum(cx2 - x), safeNum(cy2 - y)]);
          currentPath.o.push([0, 0]);
          currentPos = { x, y };
          lastControlPoint = { x: x1, y: y1 };
        }
        break;
      case 'A':
        for (let i = 0; i < args.length; i += 7) {
          const rx = args[i];
          const ry = args[i+1];
          const xAxisRotation = args[i+2];
          const largeArcFlag = args[i+3];
          const sweepFlag = args[i+4];
          const x = isRelative ? currentPos.x + args[i+5] : args[i+5];
          const y = isRelative ? currentPos.y + args[i+6] : args[i+6];
          
          if (currentPos.x === x && currentPos.y === y) continue;
          if (rx === 0 || ry === 0) {
            currentPath.v.push([safeNum(x), safeNum(y)]);
            currentPath.i.push([0, 0]);
            currentPath.o.push([0, 0]);
          } else {
            const beziers = arcToCubicBeziers(currentPos.x, currentPos.y, rx, ry, xAxisRotation, largeArcFlag, sweepFlag, x, y);
            for (const b of beziers) {
              if (currentPath.v.length > 0) {
                const prevIdx = currentPath.v.length - 1;
                const prevV = currentPath.v[prevIdx];
                currentPath.o[prevIdx] = [safeNum(b.x1 - prevV[0]), safeNum(b.y1 - prevV[1])];
              }
              currentPath.v.push([safeNum(b.x), safeNum(b.y)]);
              currentPath.i.push([safeNum(b.x2 - b.x), safeNum(b.y2 - b.y)]);
              currentPath.o.push([0, 0]);
            }
          }
          currentPos = { x, y };
          lastControlPoint = { ...currentPos };
        }
        break;
      case 'Z':
        currentPath.c = true;
        currentPos = { ...startPos };
        lastControlPoint = { ...currentPos };
        break;
    }
    lastCommand = cmd;
  }

  if (currentPath && currentPath.v.length > 0) paths.push(currentPath);
  return paths;
}

function arcToCubicBeziers(x1: number, y1: number, rx: number, ry: number, angle: number, largeArcFlag: number, sweepFlag: number, x2: number, y2: number) {
  const d2r = Math.PI / 180;
  const phi = angle * d2r;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);

  const x1p = (cosPhi * (x1 - x2)) / 2 + (sinPhi * (y1 - y2)) / 2;
  const y1p = (-sinPhi * (x1 - x2)) / 2 + (cosPhi * (y1 - y2)) / 2;

  rx = Math.abs(rx);
  ry = Math.abs(ry);
  const lambda = (x1p * x1p) / (rx * rx) + (y1p * y1p) / (ry * ry);
  if (lambda > 1) {
    rx *= Math.sqrt(lambda);
    ry *= Math.sqrt(lambda);
  }

  const rx2 = rx * rx;
  const ry2 = ry * ry;
  const x1p2 = x1p * x1p;
  const y1p2 = y1p * y1p;

  let factor = Math.sqrt(Math.max(0, (rx2 * ry2 - rx2 * y1p2 - ry2 * x1p2) / (rx2 * y1p2 + ry2 * x1p2)));
  if (largeArcFlag === sweepFlag) factor = -factor;
  const cxp = (factor * rx * y1p) / ry;
  const cyp = (-factor * ry * x1p) / rx;

  const cx = cosPhi * cxp - sinPhi * cyp + (x1 + x2) / 2;
  const cy = sinPhi * cxp + cosPhi * cyp + (y1 + y2) / 2;

  const theta1 = Math.atan2((y1p - cyp) / ry, (x1p - cxp) / rx);
  let deltaTheta = Math.atan2((-y1p - cyp) / ry, (-x1p - cxp) / rx) - theta1;

  if (sweepFlag === 0 && deltaTheta > 0) deltaTheta -= 2 * Math.PI;
  else if (sweepFlag === 1 && deltaTheta < 0) deltaTheta += 2 * Math.PI;

  const segments = Math.ceil(Math.abs(deltaTheta) / (Math.PI / 2));
  const result = [];
  for (let i = 0; i < segments; i++) {
    const startTheta = theta1 + (i * deltaTheta) / segments;
    const endTheta = theta1 + ((i + 1) * deltaTheta) / segments;
    const t = (4 / 3) * Math.tan((endTheta - startTheta) / 4);
    
    const s1 = Math.sin(startTheta);
    const c1 = Math.cos(startTheta);
    const s2 = Math.sin(endTheta);
    const c2 = Math.cos(endTheta);

    const sx = rx * c1;
    const sy = ry * s1;
    const ex = rx * c2;
    const ey = ry * s2;

    result.push({
      x1: cx + cosPhi * (sx - t * ry * s1) - sinPhi * (sy + t * rx * c1),
      y1: cy + sinPhi * (sx - t * ry * s1) + cosPhi * (sy + t * rx * c1),
      x2: cx + cosPhi * (ex + t * ry * s2) - sinPhi * (ey - t * rx * c2),
      y2: cy + sinPhi * (ex + t * ry * s2) + cosPhi * (ey - t * rx * c2),
      x: cx + cosPhi * ex - sinPhi * ey,
      y: cy + sinPhi * ex + cosPhi * ey
    });
  }
  return result;
}

export function createLottieFromSvg(
  svgContent: string,
  name: string = 'Sticker',
  fps: number = 60,
  scaleMultiplier: number = 1
): LottieAnimation {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svgContent, 'image/svg+xml');
  const svg = doc.querySelector('svg');
  if (!svg) throw new Error('Invalid SVG content');

  const viewBoxAttr = svg.getAttribute('viewBox');
  const viewBox = viewBoxAttr ? viewBoxAttr.split(/[\s,]+/).map(Number) : null;
  const width = parseInt(svg.getAttribute('width') || (viewBox ? viewBox[2].toString() : '512'));
  const height = parseInt(svg.getAttribute('height') || (viewBox ? viewBox[3].toString() : '512'));
  const offsetX = viewBox ? viewBox[0] : 0;
  const offsetY = viewBox ? viewBox[1] : 0;
  
  // Calculate scale to fit within 512x512 while preserving aspect ratio
  const contentWidth = viewBox ? viewBox[2] : width;
  const contentHeight = viewBox ? viewBox[3] : height;
  const fitScale = Math.min(512 / contentWidth, 512 / contentHeight);
  const outputScale = fitScale * clampScaleMultiplier(scaleMultiplier);
  
  // Calculate centering offsets
  const centeredX = (512 - contentWidth * outputScale) / 2;
  const centeredY = (512 - contentHeight * outputScale) / 2;

  const layers: LottieLayer[] = [];
  const elements = doc.querySelectorAll('path, rect, circle, ellipse, line, polygon, polyline');

  elements.forEach((el, index) => {
    let d = '';
    const tagName = el.tagName.toLowerCase();
    if (tagName === 'path') d = el.getAttribute('d') || '';
    else if (tagName === 'rect') {
      const x = Number(el.getAttribute('x') || 0);
      const y = Number(el.getAttribute('y') || 0);
      const w = Number(el.getAttribute('width') || 0);
      const h = Number(el.getAttribute('height') || 0);
      d = `M${x},${y} h${w} v${h} h${-w} z`;
    } else if (tagName === 'circle') {
      const cx = Number(el.getAttribute('cx') || 0);
      const cy = Number(el.getAttribute('cy') || 0);
      const r = Number(el.getAttribute('r') || 0);
      const c = r * 0.551915;
      d = `M${cx},${cy-r} C${cx+c},${cy-r} ${cx+r},${cy-c} ${cx+r},${cy} C${cx+r},${cy+c} ${cx+c},${cy+r} ${cx},${cy+r} C${cx-c},${cy+r} ${cx-r},${cy+c} ${cx-r},${cy} C${cx-r},${cy-c} ${cx-c},${cy-r} ${cx},${cy-r} Z`;
    } else if (tagName === 'ellipse') {
      const cx = Number(el.getAttribute('cx') || 0);
      const cy = Number(el.getAttribute('cy') || 0);
      const rx = Number(el.getAttribute('rx') || 0);
      const ry = Number(el.getAttribute('ry') || 0);
      const cx_bez = rx * 0.551915;
      const cy_bez = ry * 0.551915;
      d = `M${cx},${cy-ry} C${cx+cx_bez},${cy-ry} ${cx+rx},${cy-cy_bez} ${cx+rx},${cy} C${cx+rx},${cy+cy_bez} ${cx+cx_bez},${cy+ry} ${cx},${cy+ry} C${cx-cx_bez},${cy+ry} ${cx-rx},${cy+cy_bez} ${cx-rx},${cy} C${cx-rx},${cy-cy_bez} ${cx-cx_bez},${cy-ry} ${cx},${cy-ry} Z`;
    } else if (tagName === 'line') {
      const x1 = el.getAttribute('x1') || 0;
      const y1 = el.getAttribute('y1') || 0;
      const x2 = el.getAttribute('x2') || 0;
      const y2 = el.getAttribute('y2') || 0;
      d = `M${x1},${y1} L${x2},${y2}`;
    } else if (tagName === 'polygon' || tagName === 'polyline') {
      const points = el.getAttribute('points') || '';
      const coords = points.split(/[\s,]+/).filter(Boolean);
      if (coords.length >= 2) {
        d = `M${coords[0]},${coords[1]}`;
        for (let i = 2; i < coords.length; i += 2) {
          d += ` L${coords[i]},${coords[i+1]}`;
        }
        if (tagName === 'polygon') d += ' Z';
      }
    }
    if (!d) return;

    // Check if element is inside defs, mask, clipPath, symbol, etc. or is hidden
    let isHidden = false;
    let parent = el.parentElement;
    while (parent && parent.tagName.toLowerCase() !== 'svg') {
      const pt = parent.tagName.toLowerCase();
      if (['defs', 'mask', 'clippath', 'symbol', 'pattern', 'marker'].includes(pt)) {
        isHidden = true;
        break;
      }
      if (parent.getAttribute('display') === 'none' || parent.getAttribute('visibility') === 'hidden') {
        isHidden = true;
        break;
      }
      parent = parent.parentElement;
    }
    if (isHidden) return;
    if (el.getAttribute('display') === 'none' || el.getAttribute('visibility') === 'hidden') return;

    const getInheritedAttribute = (element: Element, attrName: string): string | null => {
      let current: Element | null = element;
      while (current && current.tagName.toLowerCase() !== 'svg') {
        const direct = current.getAttribute(attrName);
        if (direct && direct !== 'inherit') return direct;
        const style = current.getAttribute('style');
        if (style) {
          const regex = new RegExp(`${attrName}\\s*:\\s*([^;]+)`, 'i');
          const match = style.match(regex);
          if (match && match[1].trim() !== 'inherit') return match[1].trim();
        }
        current = current.parentElement;
      }
      return null;
    };

    const getCombinedMatrix = (element: Element): number[] => {
      let matrix = [1, 0, 0, 1, 0, 0];
      let current: Element | null = element;
      while (current && current.tagName.toLowerCase() !== 'svg') {
        const transform = current.getAttribute('transform');
        if (transform) {
          const m = parseTransform(transform);
          matrix = multiplyMatrices(m, matrix);
        }
        current = current.parentElement;
      }
      return matrix;
    };

    const parseTransform = (transform: string): number[] => {
      let matrix = [1, 0, 0, 1, 0, 0];
      const regex = /(\w+)\(([^)]+)\)/g;
      let match;
      while ((match = regex.exec(transform)) !== null) {
        const type = match[1];
        const args = match[2].split(/[\s,]+/).map(Number);
        if (type === 'matrix' && args.length === 6) {
          matrix = multiplyMatrices(matrix, args);
        } else if (type === 'translate') {
          matrix = multiplyMatrices(matrix, [1, 0, 0, 1, args[0], args[1] || 0]);
        } else if (type === 'scale') {
          matrix = multiplyMatrices(matrix, [args[0], 0, 0, args[1] || args[0], 0, 0]);
        } else if (type === 'rotate') {
          const a = (args[0] * Math.PI) / 180;
          const cos = Math.cos(a);
          const sin = Math.sin(a);
          if (args.length === 3) {
            matrix = multiplyMatrices(matrix, [1, 0, 0, 1, args[1], args[2]]);
            matrix = multiplyMatrices(matrix, [cos, sin, -sin, cos, 0, 0]);
            matrix = multiplyMatrices(matrix, [1, 0, 0, 1, -args[1], -args[2]]);
          } else {
            matrix = multiplyMatrices(matrix, [cos, sin, -sin, cos, 0, 0]);
          }
        }
      }
      return matrix;
    };

    const multiplyMatrices = (m1: number[], m2: number[]): number[] => {
      return [
        m1[0] * m2[0] + m1[2] * m2[1],
        m1[1] * m2[0] + m1[3] * m2[1],
        m1[0] * m2[2] + m1[2] * m2[3],
        m1[1] * m2[2] + m1[3] * m2[3],
        m1[0] * m2[4] + m1[2] * m2[5] + m1[4],
        m1[1] * m2[4] + m1[3] * m2[5] + m1[5]
      ];
    };

    const fill = getInheritedAttribute(el, 'fill');
    const stroke = getInheritedAttribute(el, 'stroke');
    const strokeWidth = getInheritedAttribute(el, 'stroke-width');
    if ((!fill || fill === 'none') && (!stroke || stroke === 'none')) return;

    const matrix = getCombinedMatrix(el);
    const [ma, mb, mc, md, me, mf] = matrix;

    const parseColor = (colorStr: string): [number, number, number, number] | null => {
      if (!colorStr || colorStr === 'none' || colorStr === 'transparent') return null;
      const c = colorStr.toLowerCase().trim();
      if (c.startsWith('#')) {
        const hex = c.length === 4 ? `#${c[1]}${c[1]}${c[2]}${c[2]}${c[3]}${c[3]}` : c;
        return [parseInt(hex.slice(1, 3), 16) / 255, parseInt(hex.slice(3, 5), 16) / 255, parseInt(hex.slice(5, 7), 16) / 255, 1];
      } else if (c.startsWith('rgb')) {
        const parts = c.match(/\d+/g);
        if (parts) return [parseInt(parts[0]) / 255, parseInt(parts[1]) / 255, parseInt(parts[2]) / 255, 1];
      } else {
        const colors: Record<string, string> = { black: '#000000', white: '#ffffff', red: '#ff0000', blue: '#0000ff', green: '#00ff00', yellow: '#ffff00', purple: '#800080', gray: '#808080', silver: '#c0c0c0' };
        if (c === 'currentcolor') return [0, 0, 0, 1];
        if (colors[c]) return parseColor(colors[c]);
      }
      return null;
    };

    const fillColor = parseColor(fill || 'none');
    const strokeColor = parseColor(stroke || 'none');
    const rawStrokeWidth = strokeWidth ? Number(strokeWidth) : (stroke ? 1 : 0);
    const matrixScale = Math.sqrt(ma * ma + mb * mb);
    const sWidth = rawStrokeWidth * matrixScale * outputScale;

    const opacity = getInheritedAttribute(el, 'opacity');
    const fillOpacity = getInheritedAttribute(el, 'fill-opacity');
    const strokeOpacity = getInheritedAttribute(el, 'stroke-opacity');
    const globalOp = opacity ? Number(opacity) * 100 : 100;
    const fOp = fillOpacity ? Number(fillOpacity) * globalOp : globalOp;
    const sOp = strokeOpacity ? Number(strokeOpacity) * globalOp : globalOp;

    const fillRule = getInheritedAttribute(el, 'fill-rule') || getInheritedAttribute(el, 'clip-rule') || 'nonzero';
    const lottieFillRule = fillRule.toLowerCase() === 'evenodd' ? 2 : 1;
    const lineCap = getInheritedAttribute(el, 'stroke-linecap') || 'butt';
    const lottieLineCap = lineCap === 'round' ? 2 : (lineCap === 'square' ? 3 : 1);
    const lineJoin = getInheritedAttribute(el, 'stroke-linejoin') || 'miter';
    const lottieLineJoin = lineJoin === 'round' ? 2 : (lineJoin === 'bevel' ? 3 : 1);

    const lottieSubPaths = svgPathToLottie(d);
    const processedPaths = lottieSubPaths.map(lp => ({
      v: lp.v.map(([vx, vy]) => [(vx * ma + vy * mc + me - offsetX) * outputScale + centeredX, (vx * mb + vy * md + mf - offsetY) * outputScale + centeredY]),
      i: lp.i.map(([vx, vy]) => [(vx * ma + vy * mc) * outputScale, (vx * mb + vy * md) * outputScale]),
      o: lp.o.map(([vx, vy]) => [(vx * ma + vy * mc) * outputScale, (vx * mb + vy * md) * outputScale]),
      c: lp.c
    }));

    const shapeItems: any[] = processedPaths.map((pp, i) => ({ ty: 'sh', nm: `Path ${i + 1}`, ks: { a: 0, k: pp } }));
    if (fillColor) shapeItems.push({ ty: 'fl', nm: 'Fill 1', c: { a: 0, k: fillColor }, o: { a: 0, k: fOp }, r: lottieFillRule });
    if (strokeColor) shapeItems.push({ ty: 'st', nm: 'Stroke 1', c: { a: 0, k: strokeColor }, o: { a: 0, k: sOp }, w: { a: 0, k: sWidth }, lc: lottieLineCap, lj: lottieLineJoin, ml: 4 });
    shapeItems.push({ ty: 'tr', p: { a: 0, k: [0, 0] }, a: { a: 0, k: [0, 0] }, s: { a: 0, k: [100, 100] }, r: { a: 0, k: 0 }, o: { a: 0, k: 100 } });

    layers.push({
      ddd: 0, ind: index + 1, ty: 4, nm: `${tagName} ${index + 1}`, sr: 1,
      ks: { o: { a: 0, k: 100 }, r: { a: 0, k: 0 }, p: { a: 0, k: [0, 0, 0] }, a: { a: 0, k: [0, 0, 0] }, s: { a: 0, k: [100, 100, 100] } },
      ao: 0, shapes: [{ ty: 'gr', nm: 'Group 1', it: shapeItems }],
      ip: 0, op: fps * 3, st: 0, bm: 0
    });
  });

  if (layers.length === 0) throw new Error('No renderable paths found in SVG');

  // Reverse layers to match Lottie render order (top-to-bottom) vs SVG DOM order (bottom-to-top)
  return { v: '5.5.7', fr: fps, ip: 0, op: fps * 3, w: 512, h: 512, nm: name, ddd: 0, assets: [], layers: layers.reverse() };
}

export function gzipLottie(lottie: LottieAnimation): Uint8Array {
  const json = JSON.stringify(lottie);
  return pako.gzip(json);
}

export function ungzipLottie(data: Uint8Array): LottieAnimation {
  const json = pako.ungzip(data, { to: 'string' });
  return JSON.parse(json);
}
