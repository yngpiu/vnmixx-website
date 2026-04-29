import type { HeaderCategoryNode, ShopCategory } from '@/modules/header/types/header';

function sortNodes(nodes: HeaderCategoryNode[]): HeaderCategoryNode[] {
  return nodes.sort((leftNode, rightNode) => {
    if (leftNode.sortOrder !== rightNode.sortOrder) {
      return leftNode.sortOrder - rightNode.sortOrder;
    }
    return leftNode.name.localeCompare(rightNode.name, 'vi');
  });
}

export function buildHeaderCategoryTree(categories: ShopCategory[]): HeaderCategoryNode[] {
  const activeCategories = categories.filter((category) => category.isActive);
  const categoryMap = new Map<number, HeaderCategoryNode>();
  for (const category of activeCategories) {
    categoryMap.set(category.id, {
      id: category.id,
      name: category.name,
      slug: category.slug,
      sortOrder: category.sortOrder,
      isFeatured: category.isFeatured,
      showInHeader: category.showInHeader,
      children: [],
    });
  }
  const rootNodes: HeaderCategoryNode[] = [];
  for (const category of activeCategories) {
    const currentNode = categoryMap.get(category.id);
    if (!currentNode) {
      continue;
    }
    const parentId = category.parent?.id ?? null;
    if (!parentId) {
      rootNodes.push(currentNode);
      continue;
    }
    const parentNode = categoryMap.get(parentId);
    if (!parentNode) {
      rootNodes.push(currentNode);
      continue;
    }
    parentNode.children.push(currentNode);
  }
  for (const node of categoryMap.values()) {
    sortNodes(node.children);
  }
  const sortedRootNodes = sortNodes(rootNodes);
  return sortedRootNodes.filter((node) => node.showInHeader);
}
