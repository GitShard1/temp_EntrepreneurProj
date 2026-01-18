declare namespace JSX {
  interface IntrinsicElements {
    'spline-viewer': React.DetailedHTMLProps<
      React.HTMLAttributes<HTMLElement> & {
        url?: string
        style?: React.CSSProperties
      },
      HTMLElement
    >
  }
}
