import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Modal
} from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { api, API_BASE_URL, setApiBaseUrl } from '../api/client';
import { User } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: User) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLoginSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);

  // -------------------------------------------------------------
  // ERROR MANAGEMENT STATE (UX / UI)
  // -------------------------------------------------------------
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  const clearError = (field?: string) => {
    if (field) {
      setFieldErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
    if (globalError) {
      setGlobalError(null);
    }
  };

  // -------------------------------------------------------------
  // LOGIN FORM STATE
  // -------------------------------------------------------------
  const [loginPhone, setLoginPhone] = useState('+33 ');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);

  // -------------------------------------------------------------
  // REGISTER FORM STATE
  // -------------------------------------------------------------
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [registerPhone, setRegisterPhone] = useState('+33 ');
  const [sex, setSex] = useState<'HOMME' | 'FEMME'>('HOMME');

  // Native Date Picker State
  const [selectedBirthDate, setSelectedBirthDate] = useState<Date | null>(new Date(1998, 4, 15));
  const [tempPickerDate, setTempPickerDate] = useState<Date>(new Date(1998, 4, 15));
  const [showDatePickerModal, setShowDatePickerModal] = useState(false);
  const [hasPickedDate, setHasPickedDate] = useState(false);

  // Passwords with eye toggles
  const [registerPassword, setRegisterPassword] = useState('');
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Server Config
  const [serverUrl, setServerUrl] = useState(API_BASE_URL);
  const [showConfig, setShowConfig] = useState(false);

  // -------------------------------------------------------------
  // DATE PICKER HANDLERS
  // -------------------------------------------------------------
  const onDateChange = (event: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePickerModal(false);
      if (event.type === 'set' && date) {
        setSelectedBirthDate(date);
        setHasPickedDate(true);
        clearError('birthDate');
      }
    } else {
      if (date) {
        setTempPickerDate(date);
      }
    }
  };

  const handleConfirmIosDate = () => {
    setSelectedBirthDate(tempPickerDate);
    setHasPickedDate(true);
    clearError('birthDate');
    setShowDatePickerModal(false);
  };

  // -------------------------------------------------------------
  // SUBMISSION: LOGIN
  // -------------------------------------------------------------
  const handleLogin = async () => {
    const errors: Record<string, string> = {};
    const digitsOnly = loginPhone.replace(/[^0-9]/g, '');

    if (!loginPhone.trim() || digitsOnly.length < 6) {
      errors.loginPhone = 'Numéro requis';
    }
    if (!loginPassword.trim()) {
      errors.loginPassword = 'Mot de passe requis';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGlobalError('Veuillez remplir tous les champs.');
      return;
    }

    try {
      setLoading(true);
      setGlobalError(null);
      setFieldErrors({});
      setApiBaseUrl(serverUrl);

      const user = await api.auth.login(loginPhone.trim(), loginPassword.trim());
      onLoginSuccess(user);
    } catch (e: any) {
      setGlobalError('Numéro ou mot de passe incorrect.');
      setFieldErrors({
        loginPhone: 'Incorrect',
        loginPassword: 'Mot de passe erroné'
      });
    } finally {
      setLoading(false);
    }
  };

  // -------------------------------------------------------------
  // SUBMISSION: REGISTER
  // -------------------------------------------------------------
  const handleRegister = async () => {
    const errors: Record<string, string> = {};
    const digitsOnly = registerPhone.replace(/[^0-9]/g, '');

    if (!firstName.trim()) {
      errors.firstName = 'Prénom requis';
    }
    if (!lastName.trim()) {
      errors.lastName = 'Nom requis';
    }
    if (!registerPhone.trim() || digitsOnly.length < 6) {
      errors.registerPhone = 'Numéro invalide';
    }
    if (!hasPickedDate && !selectedBirthDate) {
      errors.birthDate = 'Date de naissance requise';
    }
    if (!registerPassword.trim() || registerPassword.length < 4) {
      errors.registerPassword = 'Min. 4 caractères';
    }
    if (registerPassword !== confirmPassword) {
      errors.confirmPassword = 'Mots de passe différents';
    }

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setGlobalError('Veuillez corriger les champs indiqués.');
      return;
    }

    const isoBirthDate = selectedBirthDate
      ? selectedBirthDate.toISOString().split('T')[0]
      : undefined;

    try {
      setLoading(true);
      setGlobalError(null);
      setFieldErrors({});
      setApiBaseUrl(serverUrl);

      const user = await api.auth.register({
        phone: registerPhone.trim(),
        password: registerPassword.trim(),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        gender: sex,
        sex,
        birthDate: isoBirthDate
      });
      onLoginSuccess(user);
    } catch (e: any) {
      const errMsg = e.message || '';
      const isAlreadyTaken =
        errMsg.toLowerCase().includes('existe') ||
        errMsg.toLowerCase().includes('déjà') ||
        errMsg.toLowerCase().includes('already');

      if (isAlreadyTaken) {
        setGlobalError('Ce numéro est déjà utilisé.');
        setFieldErrors({
          registerPhone: 'Numéro déjà enregistré'
        });
      } else {
        setGlobalError(errMsg || 'Erreur lors de la création du compte.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoAdmin = () => {
    setLoginPhone('+33 6 99 88 77 66');
    setLoginPassword('AdminPassword2026!');
    setGlobalError(null);
    setFieldErrors({});
  };

  // Format Date for Display
  const formattedDateDisplay = selectedBirthDate && hasPickedDate
    ? selectedBirthDate.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'long',
        year: 'numeric'
      })
    : 'Sélectionnez votre date de naissance';

  // -------------------------------------------------------------
  // BRAND LOGO (Matching Reference Image)
  // -------------------------------------------------------------
  const renderLogo = () => (
    <View style={styles.logoWrapper}>
      <View style={styles.dotsRow}>
        <View style={[styles.dot, { backgroundColor: '#facc15' }]} />
        <View style={[styles.dot, { backgroundColor: '#38bdf8' }]} />
        <View style={[styles.dot, { backgroundColor: '#4ade80' }]} />
      </View>
      <Text style={styles.logoText}>mcad</Text>
    </View>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Top Back Arrow for Registration Screen */}
        {isRegister && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              setIsRegister(false);
              setGlobalError(null);
              setFieldErrors({});
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.backArrow}>←</Text>
          </TouchableOpacity>
        )}

        {/* 🎨 Centered Logo */}
        {renderLogo()}

        {/* ⚠️ GLOBAL ERROR BANNER (UX/UI Feedback) */}
        {globalError && (
          <View style={styles.globalErrorBanner}>
            <View style={styles.globalErrorIconBox}>
              <Text style={styles.globalErrorIcon}>⚠️</Text>
            </View>
            <View style={styles.globalErrorTextBox}>
              <Text style={styles.globalErrorTitle}>Attention</Text>
              <Text style={styles.globalErrorDesc}>{globalError}</Text>
            </View>
            <TouchableOpacity
              style={styles.globalErrorCloseBtn}
              onPress={() => setGlobalError(null)}
              activeOpacity={0.7}
            >
              <Text style={styles.globalErrorCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* --------------------------------------------------------- */}
        {/* 1. CONNEXION (Login Screen)                               */}
        {/* --------------------------------------------------------- */}
        {!isRegister ? (
          <View style={styles.formContainer}>
            <Text style={styles.screenHeading}>Connexion à votre compte</Text>

            {/* Input: Numéro de téléphone */}
            <View
              style={[
                styles.inputCard,
                fieldErrors.loginPhone && styles.inputCardError
              ]}
            >
              <Text
                style={[
                  styles.inputCardLabel,
                  fieldErrors.loginPhone && styles.inputCardLabelError
                ]}
              >
                Numéro de téléphone
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={loginPhone}
                onChangeText={(t) => {
                  setLoginPhone(t);
                  clearError('loginPhone');
                }}
                autoCapitalize="none"
              />
            </View>
            {fieldErrors.loginPhone && (
              <View style={styles.fieldErrorRow}>
                <Text style={styles.fieldErrorDot}>•</Text>
                <Text style={styles.fieldErrorText}>{fieldErrors.loginPhone}</Text>
              </View>
            )}

            {/* Input: Mot de passe */}
            <View
              style={[
                styles.inputCard,
                fieldErrors.loginPassword && styles.inputCardError
              ]}
            >
              <Text
                style={[
                  styles.inputCardLabel,
                  fieldErrors.loginPassword && styles.inputCardLabelError
                ]}
              >
                Mot de passe
              </Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.inputField, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showLoginPassword}
                  value={loginPassword}
                  onChangeText={(t) => {
                    setLoginPassword(t);
                    clearError('loginPassword');
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowLoginPassword(!showLoginPassword)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeIcon}>{showLoginPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {fieldErrors.loginPassword && (
              <View style={styles.fieldErrorRow}>
                <Text style={styles.fieldErrorDot}>•</Text>
                <Text style={styles.fieldErrorText}>{fieldErrors.loginPassword}</Text>
              </View>
            )}

            {/* Primary Action Button: Se connecter */}
            <TouchableOpacity
              style={styles.primaryButton}
              disabled={loading}
              onPress={handleLogin}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>Se connecter</Text>
              )}
            </TouchableOpacity>

            {/* Demo Account Quick Fill */}
            <TouchableOpacity
              style={styles.demoPill}
              onPress={handleQuickDemoAdmin}
              activeOpacity={0.7}
            >
              <Text style={styles.demoPillText}>
                ⚡ Compte Démo (+33 6 99 88 77 66)
              </Text>
            </TouchableOpacity>

            {/* Switch to Register */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchAuthText}>Vous n'avez pas de compte ? </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsRegister(true);
                  setGlobalError(null);
                  setFieldErrors({});
                }}
              >
                <Text style={styles.switchAuthLink}>S'inscrire</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* --------------------------------------------------------- */
          /* 2. CRÉER UN COMPTE (Create Account Screen)                */
          /* --------------------------------------------------------- */
          <View style={styles.formContainer}>
            <Text style={styles.screenHeading}>Créer votre compte</Text>

            {/* Input: Prénom */}
            <View
              style={[
                styles.inputCard,
                fieldErrors.firstName && styles.inputCardError
              ]}
            >
              <Text
                style={[
                  styles.inputCardLabel,
                  fieldErrors.firstName && styles.inputCardLabelError
                ]}
              >
                Prénom
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="Ex: Jean"
                placeholderTextColor="#94a3b8"
                value={firstName}
                onChangeText={(t) => {
                  setFirstName(t);
                  clearError('firstName');
                }}
              />
            </View>
            {fieldErrors.firstName && (
              <View style={styles.fieldErrorRow}>
                <Text style={styles.fieldErrorDot}>•</Text>
                <Text style={styles.fieldErrorText}>{fieldErrors.firstName}</Text>
              </View>
            )}

            {/* Input: Nom */}
            <View
              style={[
                styles.inputCard,
                fieldErrors.lastName && styles.inputCardError
              ]}
            >
              <Text
                style={[
                  styles.inputCardLabel,
                  fieldErrors.lastName && styles.inputCardLabelError
                ]}
              >
                Nom
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="Ex: Kouassi"
                placeholderTextColor="#94a3b8"
                value={lastName}
                onChangeText={(t) => {
                  setLastName(t);
                  clearError('lastName');
                }}
              />
            </View>
            {fieldErrors.lastName && (
              <View style={styles.fieldErrorRow}>
                <Text style={styles.fieldErrorDot}>•</Text>
                <Text style={styles.fieldErrorText}>{fieldErrors.lastName}</Text>
              </View>
            )}

            {/* Input: Numéro de téléphone */}
            <View
              style={[
                styles.inputCard,
                fieldErrors.registerPhone && styles.inputCardError
              ]}
            >
              <Text
                style={[
                  styles.inputCardLabel,
                  fieldErrors.registerPhone && styles.inputCardLabelError
                ]}
              >
                Numéro de téléphone
              </Text>
              <TextInput
                style={styles.inputField}
                placeholder="+33 6 12 34 56 78"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={registerPhone}
                onChangeText={(t) => {
                  setRegisterPhone(t);
                  clearError('registerPhone');
                }}
                autoCapitalize="none"
              />
            </View>
            {fieldErrors.registerPhone && (
              <View style={styles.fieldErrorRow}>
                <Text style={styles.fieldErrorDot}>•</Text>
                <Text style={styles.fieldErrorText}>{fieldErrors.registerPhone}</Text>
              </View>
            )}

            {/* Input: Sexe (Homme / Femme) */}
            <View style={styles.inputCard}>
              <Text style={styles.inputCardLabel}>Sexe</Text>
              <View style={styles.genderRow}>
                <TouchableOpacity
                  style={[styles.genderBtn, sex === 'HOMME' && styles.genderBtnActive]}
                  onPress={() => setSex('HOMME')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderBtnText, sex === 'HOMME' && styles.genderBtnTextActive]}>
                    👨 Homme
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.genderBtn, sex === 'FEMME' && styles.genderBtnActive]}
                  onPress={() => setSex('FEMME')}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.genderBtnText, sex === 'FEMME' && styles.genderBtnTextActive]}>
                    👩 Femme
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Input: Date de naissance (Native DatePicker Trigger) */}
            <TouchableOpacity
              style={[
                styles.inputCard,
                fieldErrors.birthDate && styles.inputCardError
              ]}
              onPress={() => {
                setTempPickerDate(selectedBirthDate || new Date(1998, 4, 15));
                setShowDatePickerModal(true);
              }}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.inputCardLabel,
                  fieldErrors.birthDate && styles.inputCardLabelError
                ]}
              >
                Date de naissance
              </Text>
              <View style={styles.datePickerTriggerRow}>
                <Text
                  style={[
                    styles.datePickerValueText,
                    !hasPickedDate && styles.datePickerPlaceholderText
                  ]}
                >
                  {formattedDateDisplay}
                </Text>
                <Text style={styles.datePickerIcon}>📅</Text>
              </View>
            </TouchableOpacity>
            {fieldErrors.birthDate && (
              <View style={styles.fieldErrorRow}>
                <Text style={styles.fieldErrorDot}>•</Text>
                <Text style={styles.fieldErrorText}>{fieldErrors.birthDate}</Text>
              </View>
            )}

            {/* Input: Mot de passe */}
            <View
              style={[
                styles.inputCard,
                fieldErrors.registerPassword && styles.inputCardError
              ]}
            >
              <Text
                style={[
                  styles.inputCardLabel,
                  fieldErrors.registerPassword && styles.inputCardLabelError
                ]}
              >
                Mot de passe
              </Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.inputField, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showRegisterPassword}
                  value={registerPassword}
                  onChangeText={(t) => {
                    setRegisterPassword(t);
                    clearError('registerPassword');
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowRegisterPassword(!showRegisterPassword)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeIcon}>{showRegisterPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {fieldErrors.registerPassword && (
              <View style={styles.fieldErrorRow}>
                <Text style={styles.fieldErrorDot}>•</Text>
                <Text style={styles.fieldErrorText}>{fieldErrors.registerPassword}</Text>
              </View>
            )}

            {/* Input: Confirmer le mot de passe */}
            <View
              style={[
                styles.inputCard,
                fieldErrors.confirmPassword && styles.inputCardError
              ]}
            >
              <Text
                style={[
                  styles.inputCardLabel,
                  fieldErrors.confirmPassword && styles.inputCardLabelError
                ]}
              >
                Confirmer le mot de passe
              </Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.inputField, { flex: 1 }]}
                  placeholder="••••••••"
                  placeholderTextColor="#94a3b8"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={(t) => {
                    setConfirmPassword(t);
                    clearError('confirmPassword');
                  }}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  <Text style={styles.eyeIcon}>{showConfirmPassword ? '🙈' : '👁️'}</Text>
                </TouchableOpacity>
              </View>
            </View>
            {fieldErrors.confirmPassword && (
              <View style={styles.fieldErrorRow}>
                <Text style={styles.fieldErrorDot}>•</Text>
                <Text style={styles.fieldErrorText}>{fieldErrors.confirmPassword}</Text>
              </View>
            )}

            {/* Primary Action Button: S'inscrire */}
            <TouchableOpacity
              style={styles.primaryButton}
              disabled={loading}
              onPress={handleRegister}
              activeOpacity={0.85}
            >
              {loading ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text style={styles.primaryButtonText}>S'inscrire</Text>
              )}
            </TouchableOpacity>

            {/* Switch to Login */}
            <View style={styles.switchAuthRow}>
              <Text style={styles.switchAuthText}>Vous avez déjà un compte ? </Text>
              <TouchableOpacity
                onPress={() => {
                  setIsRegister(false);
                  setGlobalError(null);
                  setFieldErrors({});
                }}
              >
                <Text style={styles.switchAuthLink}>Se connecter</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ⚙ Config serveur (IP) */}
        <TouchableOpacity
          style={styles.configToggle}
          onPress={() => setShowConfig(!showConfig)}
        >
          <Text style={styles.configToggleText}>⚙ Config serveur ({serverUrl})</Text>
        </TouchableOpacity>

        {showConfig && (
          <View style={styles.configBox}>
            <Text style={styles.configLabel}>Adresse du serveur API :</Text>
            <TextInput
              style={styles.configInput}
              value={serverUrl}
              onChangeText={setServerUrl}
              placeholder="http://localhost:3000"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
            />
          </View>
        )}
      </ScrollView>

      {/* 📅 Native DatePicker Modal on iOS */}
      {Platform.OS === 'ios' && showDatePickerModal && (
        <Modal
          visible={showDatePickerModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDatePickerModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.datePickerModalCard}>
              <View style={styles.datePickerModalHeader}>
                <TouchableOpacity onPress={() => setShowDatePickerModal(false)}>
                  <Text style={styles.datePickerCancelText}>Annuler</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerModalTitle}>Date de naissance</Text>
                <TouchableOpacity onPress={handleConfirmIosDate}>
                  <Text style={styles.datePickerConfirmText}>Confirmer</Text>
                </TouchableOpacity>
              </View>

              <DateTimePicker
                value={tempPickerDate}
                mode="date"
                display="spinner"
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                onChange={onDateChange}
                textColor="#0f172a"
                locale="fr-FR"
              />
            </View>
          </View>
        </Modal>
      )}

      {/* 📅 Native DatePicker on Android */}
      {Platform.OS === 'android' && showDatePickerModal && (
        <DateTimePicker
          value={selectedBirthDate || new Date(1998, 4, 15)}
          mode="date"
          display="default"
          maximumDate={new Date()}
          minimumDate={new Date(1920, 0, 1)}
          onChange={onDateChange}
        />
      )}
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff'
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 40
  },

  // Back button on Register
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8
  },
  backArrow: {
    fontSize: 22,
    color: '#1e3a8a',
    fontWeight: '700',
    lineHeight: 24
  },

  // Centered Logo (Style of reference image)
  logoWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 18
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3
  },
  logoText: {
    fontSize: 34,
    fontWeight: '900',
    color: '#1e3a8a',
    letterSpacing: -0.5
  },

  // ⚠️ GLOBAL ERROR BANNER
  globalErrorBanner: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecdd3',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    shadowColor: '#ef4444',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2
  },
  globalErrorIconBox: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#fee2e2',
    alignItems: 'center',
    justifyContent: 'center'
  },
  globalErrorIcon: {
    fontSize: 16
  },
  globalErrorTextBox: {
    flex: 1
  },
  globalErrorTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#991b1b',
    marginBottom: 1
  },
  globalErrorDesc: {
    fontSize: 11,
    color: '#b91c1c',
    lineHeight: 15
  },
  globalErrorCloseBtn: {
    padding: 4
  },
  globalErrorCloseText: {
    fontSize: 14,
    color: '#991b1b',
    fontWeight: '800'
  },

  // Heading
  formContainer: {
    marginTop: 4
  },
  screenHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
    marginBottom: 18,
    textAlign: 'left'
  },

  // Input Card Box (Clean Floating Box with subtle shadow)
  inputCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 10,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2
  },
  inputCardError: {
    borderColor: '#ef4444',
    backgroundColor: '#fffcfc',
    shadowColor: '#ef4444',
    shadowOpacity: 0.1
  },
  inputCardLabel: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 2
  },
  inputCardLabelError: {
    color: '#dc2626',
    fontWeight: '700'
  },
  inputField: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a',
    paddingVertical: 4
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center'
  },
  eyeBtn: {
    padding: 6
  },
  eyeIcon: {
    fontSize: 16
  },

  // Field Error Row (Underneath specific invalid input)
  fieldErrorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: -8,
    marginBottom: 12,
    paddingHorizontal: 6
  },
  fieldErrorDot: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '900'
  },
  fieldErrorText: {
    fontSize: 11,
    color: '#dc2626',
    fontWeight: '600'
  },

  // Gender Row
  genderRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 6
  },
  genderBtn: {
    flex: 1,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center'
  },
  genderBtnActive: {
    backgroundColor: '#1e3a8a',
    borderColor: '#1e3a8a'
  },
  genderBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748b'
  },
  genderBtnTextActive: {
    color: '#ffffff'
  },

  // DatePicker Trigger Row
  datePickerTriggerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4
  },
  datePickerValueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0f172a'
  },
  datePickerPlaceholderText: {
    color: '#94a3b8',
    fontWeight: '500'
  },
  datePickerIcon: {
    fontSize: 16
  },

  // Date Picker Modal (iOS)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end'
  },
  datePickerModalCard: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 16,
    paddingBottom: 32,
    paddingHorizontal: 20
  },
  datePickerModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10
  },
  datePickerModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0f172a'
  },
  datePickerCancelText: {
    fontSize: 14,
    color: '#64748b',
    fontWeight: '600'
  },
  datePickerConfirmText: {
    fontSize: 14,
    color: '#1e3a8a',
    fontWeight: '800'
  },

  // Primary Button (Royal Cobalt Blue)
  primaryButton: {
    backgroundColor: '#1e3a8a',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
    shadowColor: '#1e3a8a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.2
  },

  // Demo Pill
  demoPill: {
    backgroundColor: '#f1f5f9',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 12
  },
  demoPillText: {
    color: '#1e3a8a',
    fontSize: 11,
    fontWeight: '700'
  },

  // Switch Auth Row
  switchAuthRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 26
  },
  switchAuthText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500'
  },
  switchAuthLink: {
    fontSize: 12,
    color: '#1e3a8a',
    fontWeight: '800'
  },

  // Config Toggle
  configToggle: {
    alignItems: 'center',
    marginTop: 30
  },
  configToggleText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600'
  },
  configBox: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  configLabel: {
    fontSize: 10,
    color: '#64748b',
    marginBottom: 4
  },
  configInput: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12,
    color: '#0f172a',
    borderWidth: 1,
    borderColor: '#cbd5e1'
  }
});
