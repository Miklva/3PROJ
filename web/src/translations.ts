export type Language = 'fr' | 'en' | 'es';

export const translations = {
    fr: {
        nav: {
            home: 'Accueil',
            search: 'Recherche',
            profile: 'Profil',
            settings: 'Paramètres',
            logout: 'Déconnexion'
        },
        settings: {
            title: 'Paramètres',
            tabs: {
                profile: 'Profil',
                preferences: 'Préférences',
                security: 'Sécurité',
                data: 'Compte'
            },
            profile: {
                title: 'Informations du profil',
                username: 'Nom d\'utilisateur',
                bio: 'Biographie',
                bio_placeholder: 'Parle-nous de toi...',
                website: 'Site Web',
                avatar: 'Avatar',
                change_avatar: 'Changer l\'avatar',
                uploading: 'Upload en cours...',
                save: 'Sauvegarder les modifications'
            },
            preferences: {
                title: 'Préférences d\'affichage',
                theme: 'Thème de l\'interface',
                theme_dark: 'Sombre',
                theme_light: 'Clair',
                language: 'Langue',
                save: 'Enregistrer les préférences'
            },
            security: {
                title: 'Changer le mot de passe',
                warning: 'Assure-toi de te souvenir de ton nouveau mot de passe.',
                current: 'Mot de passe actuel',
                new: 'Nouveau mot de passe',
                new_placeholder: '6 caractères minimum',
                confirm: 'Confirmer le nouveau mot de passe',
                save: 'Modifier le mot de passe'
            },
            account: {
                title: 'Gestion du compte',
                info_subtitle: 'Informations du compte',
                email: 'Email',
                data_subtitle: 'Confidentialité & Données',
                data_desc: 'Téléchargez une copie de vos données personnelles (conformité RGPD).',
                export_btn: 'Exporter en JSON',
                danger_title: 'Zone de danger',
                danger_desc: 'Déconnecter ton compte sur cet appareil.',
                logout: 'Se déconnecter',
                delete_account: 'Supprimer le compte',
                delete_confirm: 'Êtes-vous sûr de vouloir supprimer votre compte ? Cette action est irréversible.'
            },
            messages: {
                success_profile: 'Profil mis à jour avec succès',
                success_prefs: 'Préférences mises à jour',
                success_avatar: 'Avatar mis à jour',
                success_password: 'Mot de passe modifié avec succès',
                success_export: 'Export réussi',
                success_delete_account: 'Compte supprimé',
                error_server: 'Impossible de contacter le serveur',
                error_password_match: 'Les nouveaux mots de passe ne correspondent pas',
                error_password_length: 'Le nouveau mot de passe doit faire au moins 6 caractères'
            }
        },
        profile: {
            followers: 'Abonnés',
            following: 'Abonnements',
            edit_bio: 'Éditer',
            save_bio: 'Sauvegarder',
            cancel_bio: 'Annuler',
            member_since: 'Membre depuis',
            no_bio: 'Aucune bio pour le moment.'
        },
        auth: {
            login_title: 'Se connecter',
            login_subtitle: 'Bienvenue sur SupContent',
            register_title: 'Créer un compte',
            register_subtitle: 'Rejoignez l\'aventure',
            email: 'Email',
            password: 'Mot de passe',
            confirm_password: 'Confirmer le mot de passe',
            username: 'Nom d\'utilisateur',
            btn_login: 'Se connecter',
            btn_register: 'S\'inscrire',
            btn_loading: 'Chargement...',
            or: 'OU',
            google: 'Continuer avec Google',
            github: 'Continuer avec GitHub',
            no_account: 'Pas encore de compte ?',
            has_account: 'Déjà un compte ?',
            link_login: 'Se connecter',
            link_register: 'S\'inscrire'
        }
    },

    //TODO Penser a traduire tout le site web a la fin
    en: {
        nav: {
            home: 'Home',
            search: 'Search',
            profile: 'Profile',
            settings: 'Settings',
            logout: 'Logout'
        },
        settings: {
            title: 'Settings',
            tabs: {
                profile: 'Profile',
                preferences: 'Preferences',
                security: 'Security',
                data: 'Account'
            },
            profile: {
                title: 'Profile Information',
                username: 'Username',
                bio: 'Biography',
                bio_placeholder: 'Tell us about yourself...',
                website: 'Website',
                avatar: 'Avatar',
                change_avatar: 'Change Avatar',
                uploading: 'Uploading...',
                save: 'Save Changes'
            },
            preferences: {
                title: 'Display Preferences',
                theme: 'Interface Theme',
                theme_dark: 'Dark',
                theme_light: 'Light',
                language: 'Language',
                save: 'Save Preferences'
            },
            security: {
                title: 'Change Password',
                warning: 'Make sure to remember your new password.',
                current: 'Current Password',
                new: 'New Password',
                new_placeholder: 'Minimum 6 characters',
                confirm: 'Confirm New Password',
                save: 'Update Password'
            },
            account: {
                title: 'Account Management',
                info_subtitle: 'Account Information',
                email: 'Email',
                data_subtitle: 'Privacy & Data',
                data_desc: 'Download a copy of your personal data (GDPR compliance).',
                export_btn: 'Export as JSON',
                danger_title: 'Danger Zone',
                danger_desc: 'Log out of your account on this device.',
                logout: 'Log out',
                delete_account: 'Delete Account',
                delete_confirm: 'Are you sure you want to delete your account? This action is irreversible.'
            },
            messages: {
                success_profile: 'Profile updated successfully',
                success_prefs: 'Preferences updated',
                success_avatar: 'Avatar updated',
                success_password: 'Password changed successfully',
                success_export: 'Export successful',
                success_delete_account: 'Account deleted',
                error_server: 'Unable to contact server',
                error_password_match: 'New passwords do not match',
                error_password_length: 'New password must be at least 6 characters'
            }
        },
        profile: {
            followers: 'Followers',
            following: 'Following',
            edit_bio: 'Edit',
            save_bio: 'Save',
            cancel_bio: 'Cancel',
            member_since: 'Member since',
            no_bio: 'No bio yet.'
        },
        auth: {
            login_title: 'Sign In',
            login_subtitle: 'Welcome to SupContent',
            register_title: 'Create Account',
            register_subtitle: 'Join the adventure',
            email: 'Email',
            password: 'Password',
            confirm_password: 'Confirm Password',
            username: 'Username',
            btn_login: 'Sign In',
            btn_register: 'Sign Up',
            btn_loading: 'Loading...',
            or: 'OR',
            google: 'Continue with Google',
            github: 'Continue with GitHub',
            no_account: "Don't have an account?",
            has_account: 'Already have an account?',
            link_login: 'Sign In',
            link_register: 'Sign Up'
        }
    },
    es: {
        nav: {
            home: 'Inicio',
            profile: 'Perfil',
            search: 'Nachos',
            settings: 'Ajustes',
            logout: 'Cerrar sesión'
        },
        settings: {
            title: 'Ajustes',
            tabs: {
                profile: 'Perfil',
                preferences: 'Preferencias',
                security: 'Seguridad',
                data: 'Cuenta'
            },
            profile: {
                title: 'Información del Perfil',
                username: 'Nombre de usuario',
                bio: 'Biografía',
                bio_placeholder: 'Cuéntanos sobre ti...',
                website: 'Sitio Web',
                avatar: 'Avatar',
                change_avatar: 'Cambiar Avatar',
                uploading: 'Subiendo...',
                save: 'Guardar Cambios'
            },
            preferences: {
                title: 'Preferencias de Pantalla',
                theme: 'Tema de la Interfaz',
                theme_dark: 'Oscuro',
                theme_light: 'Claro',
                language: 'Idioma',
                save: 'Guardar Preferencias'
            },
            security: {
                title: 'Cambiar Contraseña',
                warning: 'Asegúrate de recordar tu nueva contraseña.',
                current: 'Contraseña Actual',
                new: 'Nueva Contraseña',
                new_placeholder: 'Mínimo 6 caracteres',
                confirm: 'Confirmar Nueva Contraseña',
                save: 'Actualizar Contraseña'
            },
            account: {
                title: 'Gestión de Cuenta',
                info_subtitle: 'Información de la Cuenta',
                email: 'Email',
                data_subtitle: 'Privacidad y Datos',
                data_desc: 'Descargue una copia de sus datos personales (cumplimiento del RGPD).',
                export_btn: 'Exportar en JSON',
                danger_title: 'Zona de Peligro',
                danger_desc: 'Cerrar sesión en este dispositivo.',
                logout: 'Cerrar sesión',
                delete_account: 'Eliminar cuenta',
                delete_confirm: '¿Estás seguro de que quieres eliminar ta cuenta? Esta acción es irreversible.'
            },
            messages: {
                success_profile: 'Perfil actualizado con éxito',
                success_prefs: 'Preferencias actualizadas',
                success_avatar: 'Avatar actualizado',
                success_password: 'Contraseña cambiada con éxito',
                success_export: 'Exportación exitosa',
                success_delete_account: 'Cuenta eliminada',
                error_server: 'No se puede contactar con el servidor',
                error_password_match: 'Las nuevas contraseñas no coinciden',
                error_password_length: 'La nueva contraseña debe tener al menos que 6 caracteres'
            }
        },
        profile: {
            followers: 'Seguidores',
            following: 'Siguiendo',
            edit_bio: 'Editar',
            save_bio: 'Guardar',
            cancel_bio: 'Cancelar',
            member_since: 'Miembro desde',
            no_bio: 'Sin biografía aún.'
        },
        auth: {
            login_title: 'Iniciar Sesión',
            login_subtitle: 'Bienvenido a SupContent',
            register_title: 'Crear Cuenta',
            register_subtitle: 'Únete a la aventura',
            email: 'Email',
            password: 'Contraseña',
            confirm_password: 'Confirmar Contraseña',
            username: 'Nombre de usuario',
            btn_login: 'Iniciar Sesión',
            btn_register: 'Registrarse',
            btn_loading: 'Cargando...',
            or: 'O',
            google: 'Continuar con Google',
            github: 'Continuar con GitHub',
            no_account: '¿No tienes cuenta?',
            has_account: '¿Ya tienes cuenta?',
            link_login: 'Iniciar Sesión',
            link_register: 'Registrarse'
        }
    }
};

export type TranslationKeys = typeof translations.fr;
