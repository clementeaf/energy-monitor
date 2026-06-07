interface PlaceholderPageProps {
  label: string;
}

/**
 * Vista temporal hasta implementar el módulo.
 */
export function PlaceholderPage(props: PlaceholderPageProps) {
  const { label } = props;
  return (
    <div className="panel flex h-64 items-center justify-center border-2 border-dashed text-subtle">
      {label} — por implementar
    </div>
  );
}
