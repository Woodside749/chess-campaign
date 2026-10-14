// A small title badge shown before a name, like "M" for Master (as chess sites show "FM").
// The World Champion's badge is gold instead of red.
export default function TitleBadge({ title }) {
  if (!title) return null
  return (
    <span className={`title-badge title-${title.id}`} title={title.name}>
      {title.short}
    </span>
  )
}
