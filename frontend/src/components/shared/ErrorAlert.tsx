interface ErrorAlertProps {
  message: string;
  style?: React.CSSProperties;
}

export default function ErrorAlert({ message, style }: ErrorAlertProps) {
  return (
    <div
      style={{
        padding: '12px',
        backgroundColor: '#fee2e2',
        color: '#991b1b',
        borderRadius: '8px',
        marginBottom: '16px',
        fontSize: '14px',
        ...style,
      }}
    >
      {message}
    </div>
  );
}
