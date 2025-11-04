/**
 * Codemod: Convert <div role="note"> blocks into <FeatureCard />
 * Heuristic for the common shape you shared.
 *
 * Run:
 *   npx jscodeshift -t scripts/codemods/role-note-to-featurecard.js packages/web/src/app/docs \
 *     --extensions=tsx --parser=tsx
 */

module.exports = function transform(file, api) {
  const j = api.jscodeshift;
  const root = j(file.source);
  let changed = false;

  const getAttr = (el, name) => {
    const a = (el.openingElement.attributes || []).find(
      (x) => x && x.type === 'JSXAttribute' && x.name && x.name.name === name,
    );
    return a;
  };
  const attrLiteral = (a) => {
    if (!a || !a.value) return null;
    if (a.value.type === 'Literal') return String(a.value.value ?? '');
    if (a.value.type === 'JSXExpressionContainer' && a.value.expression.type === 'Literal') {
      return String(a.value.expression.value ?? '');
    }
    return null;
  };

  root.find(j.JSXElement).forEach((p) => {
    const el = p.node;
    if (el.openingElement.name.type !== 'JSXIdentifier') return;
    if (el.openingElement.name.name !== 'div') return;

    const role = attrLiteral(getAttr(el, 'role'));
    if (role !== 'note') return;

    // Children: [icon?, textContainer]
    const kids = (el.children || []).filter((c) => c && c.type === 'JSXElement');
    if (kids.length === 0) return;
    const textContainer = kids[1] || kids[0];
    if (!textContainer || textContainer.type !== 'JSXElement') return;

    // Extract title + description (very forgiving)
    let titleText = '';
    let descText = '';
    const crawl = (node) => {
      if (!node) return;
      (node.children || []).forEach((c) => {
        if (c.type === 'Literal' && c.value && String(c.value).trim()) {
          const v = String(c.value).trim();
          if (!titleText) titleText = v;
          else if (!descText) descText = v;
        }
        if (c.type === 'JSXElement') crawl(c);
      });
    };
    crawl(textContainer);
    titleText = titleText.trim();
    descText = descText.trim();
    if (!titleText) return;

    const attrs = [
      j.jsxAttribute(j.jsxIdentifier('title'), j.literal(titleText)),
      descText ? j.jsxAttribute(j.jsxIdentifier('description'), j.literal(descText)) : null,
      j.jsxAttribute(j.jsxIdentifier('iconName'), j.literal('info')),
    ].filter(Boolean);

    const feature = j.jsxElement(
      j.jsxOpeningElement(j.jsxIdentifier('FeatureCard'), attrs, true),
      null,
      [],
      true,
    );

    j(p).replaceWith(feature);
    changed = true;
  });

  if (changed) {
    // Ensure import FeatureCard from '@/components/docs/FeatureCard'
    const hasImport =
      root.find(j.ImportDeclaration, { source: { value: '@/components/docs/FeatureCard' } })
        .size() > 0;
    if (!hasImport) {
      const firstImport = root.find(j.ImportDeclaration).at(0);
      const imp = j.importDeclaration(
        [j.importDefaultSpecifier(j.identifier('FeatureCard'))],
        j.literal('@/components/docs/FeatureCard'),
      );
      if (firstImport.size()) {
        firstImport.insertBefore(imp);
      } else {
        root.get().node.program.body.unshift(imp);
      }
    }
    return root.toSource({ quote: 'single', trailingComma: true });
  }
  return null;
};
