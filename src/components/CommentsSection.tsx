import { createClientServer } from '@/lib/supabase-server';
import ReplyForm from './ReplyForm';            // replies to existing comments
import UnifiedComposer from './UnifiedComposer'; // single top composer

type CommentRow = {
  id: number;
  parent_id: number | null;
  user_id: string | null;
  body: string;
  created_at: string;
};

type TreeNode = CommentRow & { children: TreeNode[] };

function buildTree(rows: CommentRow[]): TreeNode[] {
  const byId = new Map<number, TreeNode>();
  const roots: TreeNode[] = [];

  for (const r of rows) byId.set(r.id, { ...r, children: [] });

  for (const r of byId.values()) {
    if (r.parent_id !== null && byId.has(r.parent_id)) {
      byId.get(r.parent_id)!.children.push(r);
    } else {
      roots.push(r);
    }
  }

  // newest first per level
  const sortDesc = (nodes: TreeNode[]) => {
    nodes.sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at));
    nodes.forEach((n) => sortDesc(n.children));
  };
  sortDesc(roots);

  return roots;
}

function CommentItem({
  node,
  resourceId,
  depth = 0,
}: {
  node: TreeNode;
  resourceId: number;
  depth?: number;
}) {
  return (
    <li className="mt-3">
      <div className="rounded-md border p-3">
        <p className="whitespace-pre-wrap text-sm text-gray-800">{node.body}</p>
        <div className="mt-1 flex items-center justify-between text-xs text-gray-500">
          <span>{new Date(node.created_at).toLocaleString()}</span>
        </div>
        <div className="mt-2">
          <ReplyForm resourceId={resourceId} parentId={node.id} />
        </div>
      </div>

      {node.children.length > 0 && (
        <ul className="ml-4 border-l pl-4">
          {node.children.map((child) => (
            <CommentItem key={child.id} node={child} resourceId={resourceId} depth={depth + 1} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default async function CommentsSection({ resourceId }: { resourceId: number }) {
  const supabase = await createClientServer();
  const { data: rows, error } = await supabase
    .from('comments')
    .select('id, parent_id, user_id, body, created_at')
    .eq('resource_id', resourceId)
    .order('created_at', { ascending: false })
    .limit(500);

  if (error) {
    return <div className="text-red-600">Error loading comments: {error.message}</div>;
  }

  const tree = buildTree((rows ?? []) as CommentRow[]);

  return (
    <section className="space-y-3">
      <h2 className="text-xl font-semibold">Discussion</h2>

      {/* unified composer (review + discussion in one box) */}
      <UnifiedComposer resourceId={resourceId} />

      <ul className="mt-2">
        {tree.length === 0 && <li className="text-gray-500">No comments yet.</li>}
        {tree.map((n) => (
          <CommentItem key={n.id} node={n} resourceId={resourceId} />
        ))}
      </ul>
    </section>
  );
}
