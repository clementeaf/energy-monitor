interface PlaceholderPageProps {
  label: string;
}

/**
 * Vista temporal hasta implementar el módulo.
 */
export function PlaceholderPage(props: PlaceholderPageProps) {
  const { label } = props;
  return (
    <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-gray-400">
      {label} — por implementar
    </div>
  );
}
