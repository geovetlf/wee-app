import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

/** Pantalla de error con la identidad de Weë (fondo blanco, botón amarillo con texto oscuro). */
class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error inesperado en Weë:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <Text style={styles.emoji}>😵‍💫</Text>
          <Text style={styles.title}>Algo salió mal</Text>
          <Text style={styles.message}>Weë encontró un error inesperado. Intenta de nuevo; si sigue pasando, cuéntanoslo desde Ayuda.</Text>
          {__DEV__ && this.state.error && <Text style={styles.errorDetails}>{this.state.error.toString()}</Text>}
          <TouchableOpacity style={styles.button} onPress={() => this.setState({ hasError: false, error: undefined })} accessibilityLabel="Intentar de nuevo">
            <Text style={styles.buttonText}>Intentar de nuevo</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFFFFF',
  },
  emoji: {
    fontSize: 40,
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  message: {
    fontSize: 15,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 420,
  },
  errorDetails: {
    fontSize: 12,
    color: '#B91C1C',
    marginBottom: 20,
    textAlign: 'center',
    fontFamily: 'monospace',
    maxWidth: 480,
  },
  button: {
    backgroundColor: '#F5B731',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 999,
  },
  buttonText: {
    color: '#1F2937',
    fontSize: 15,
    fontWeight: '700',
  },
});

export default ErrorBoundary;
