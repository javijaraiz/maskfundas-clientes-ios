import UIKit
import Capacitor
import LocalAuthentication
import Security

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?

    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        return true
    }

    func applicationWillResignActive(_ application: UIApplication) {
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
    }

    func applicationWillEnterForeground(_ application: UIApplication) {
        UIApplication.shared.applicationIconBadgeNumber = 0
        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(0, withCompletionHandler: nil)
        }
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        UIApplication.shared.applicationIconBadgeNumber = 0
        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(0, withCompletionHandler: nil)
        }
    }

    func applicationWillTerminate(_ application: UIApplication) {
    }

    func application(_ app: UIApplication, open url: URL, options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
        return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
    }

    func application(_ application: UIApplication, continue userActivity: NSUserActivity, restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
        return ApplicationDelegateProxy.shared.application(application, continue: userActivity, restorationHandler: restorationHandler)
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        NotificationCenter.default.post(name: .capacitorDidRegisterForRemoteNotifications, object: deviceToken)
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        NotificationCenter.default.post(name: .capacitorDidFailToRegisterForRemoteNotifications, object: error)
    }

}

// =========================================================================
// Native Biometric Authentication Plugin (Touch ID / Face ID / iOS Keychain)
// Compatible 100% con iOS 15, iOS 16, iOS 17, iOS 18+ sin requerir Associated Domains
// =========================================================================
@objc(BiometricAuthPlugin)
public class BiometricAuthPlugin: CAPPlugin, CAPBridgedPlugin {
    private var credentialReadInProgress = false

    private func whenApplicationActive(attempts: Int = 10, completion: @escaping (Bool) -> Void) {
        if UIApplication.shared.applicationState == .active {
            // Dejar terminar la transición del WebView antes de abrir Touch ID / Face ID
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                if UIApplication.shared.applicationState == .active {
                    completion(true)
                } else {
                    self.whenApplicationActive(attempts: attempts - 1, completion: completion)
                }
            }
        } else if attempts > 0 {
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.15) {
                self.whenApplicationActive(attempts: attempts - 1, completion: completion)
            }
        } else {
            completion(false)
        }
    }

    public let identifier = "BiometricAuthPlugin"
    public let jsName = "BiometricAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "isAvailable", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "hasCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getCredentials", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "deleteCredentials", returnType: CAPPluginReturnPromise)
    ]

    @objc func isAvailable(_ call: CAPPluginCall) {
        let context = LAContext()
        var error: NSError?

        let canEvaluate = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)

        var biometryType = "none"
        if #available(iOS 11.0, *) {
            switch context.biometryType {
            case .faceID:
                biometryType = "faceId"
            case .touchID:
                biometryType = "touchId"
            default:
                biometryType = "none"
            }
        }

        call.resolve([
            "isAvailable": canEvaluate,
            "hasBiometrics": canEvaluate,
            "biometryType": biometryType,
            "error": error?.localizedDescription ?? ""
        ])
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        let reason = call.getString("reason") ?? "Inicia sesión con tu huella o Face ID en MásKFundas"
        let context = LAContext()
        context.localizedCancelTitle = "Cancelar"

        var error: NSError?
        if !context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) {
            call.reject(error?.localizedDescription ?? "La autenticación biométrica no está disponible en este dispositivo.")
            return
        }

        DispatchQueue.main.async {
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, authError in
                DispatchQueue.main.async {
                    if success {
                        call.resolve([
                            "success": true
                        ])
                    } else {
                        let errMsg = authError?.localizedDescription ?? "Autenticación cancelada."
                        call.reject(errMsg)
                    }
                }
            }
        }
    }

    @objc func setCredentials(_ call: CAPPluginCall) {
        guard let token = call.getString("token"), !token.isEmpty else {
            call.reject("Token no válido")
            return
        }
        let account = call.getString("phone") ?? call.getString("email") ?? "cliente_maskfundas"
        let protectedAccount = account + ".biometry.v2"
        let service = "com.dowisp.com.biometric"

        let tokenData = token.data(using: .utf8)!

        // Validar primero que el hardware biométrico puede generar el AccessControl
        var accessError: Unmanaged<CFError>?
        guard let accessControl = SecAccessControlCreateWithFlags(
            kCFAllocatorDefault,
            kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            .biometryAny,
            &accessError
        ) else {
            let desc = accessError?.takeRetainedValue().localizedDescription ?? "Touch ID / Face ID no está disponible o no está configurado en este iPhone."
            call.reject("Autenticación biométrica obligatoria: \(desc)")
            return
        }

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: protectedAccount
        ]

        let existingStatus = SecItemCopyMatching(query as CFDictionary, nil)
        let status: OSStatus
        if existingStatus == errSecSuccess {
            status = SecItemUpdate(query as CFDictionary, [kSecValueData as String: tokenData] as CFDictionary)
        } else if existingStatus == errSecItemNotFound {
            var newQuery = query
            newQuery[kSecValueData as String] = tokenData
            newQuery[kSecAttrAccessControl as String] = accessControl
            status = SecItemAdd(newQuery as CFDictionary, nil)
        } else {
            call.reject("Error al consultar la credencial anterior: \(existingStatus)")
            return
        }

        if status == errSecSuccess {
            call.resolve(["success": true])
        } else {
            call.reject("Error al guardar credencial protegida con Touch ID / Face ID en el llavero: \(status)")
        }
    }

    @objc func hasCredentials(_ call: CAPPluginCall) {
        let account = call.getString("phone") ?? call.getString("email") ?? "cliente_maskfundas"
        let service = "com.dowisp.com.biometric"

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account + ".biometry.v2",
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        let status = SecItemCopyMatching(query as CFDictionary, nil)
        call.resolve([
            "exists": (status == errSecSuccess)
        ])
    }

    @objc func getCredentials(_ call: CAPPluginCall) {
        let account = call.getString("phone") ?? call.getString("email") ?? "cliente_maskfundas"
        let service = "com.dowisp.com.biometric"
        let reason = call.getString("reason") ?? "Inicia sesión con tu huella o Face ID en MásKFundas"

        DispatchQueue.main.async {
            guard !self.credentialReadInProgress else {
                call.reject("BIOMETRIC_BUSY")
                return
            }
            self.credentialReadInProgress = true

            self.whenApplicationActive { active in
                guard active else {
                    self.credentialReadInProgress = false
                    call.reject("APP_NOT_ACTIVE")
                    return
                }

                let context = LAContext()
                context.localizedCancelTitle = "Cancelar"
                context.localizedReason = reason

                var error: NSError?
                guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
                    self.credentialReadInProgress = false
                    call.reject(error?.localizedDescription ?? "La autenticación biométrica no está disponible en este dispositivo.")
                    return
                }

                DispatchQueue.global(qos: .userInitiated).async {
                    let query: [String: Any] = [
                        kSecClass as String: kSecClassGenericPassword,
                        kSecAttrService as String: service,
                        kSecAttrAccount as String: account + ".biometry.v2",
                        kSecReturnData as String: true,
                        kSecMatchLimit as String: kSecMatchLimitOne,
                        kSecUseAuthenticationContext as String: context
                    ]

                    var item: CFTypeRef?
                    let status = SecItemCopyMatching(query as CFDictionary, &item)

                    DispatchQueue.main.async {
                        self.credentialReadInProgress = false
                        if status == errSecSuccess, let data = item as? Data, let token = String(data: data, encoding: .utf8) {
                            call.resolve(["success": true, "token": token])
                        } else if status == errSecUserCanceled {
                            call.reject("BIOMETRIC_INTERRUPTED")
                        } else if status == errSecItemNotFound {
                            call.resolve(["success": false, "token": "", "error": "No hay credencial biométrica guardada"])
                        } else if status == errSecAuthFailed {
                            call.reject("Huella o rostro no reconocido.")
                        } else {
                            call.reject("Error al acceder a la credencial protegida: \(status)")
                        }
                    }
                }
            }
        }
    }

    @objc func deleteCredentials(_ call: CAPPluginCall) {
        let account = call.getString("phone") ?? call.getString("email") ?? "cliente_maskfundas"
        let service = "com.dowisp.com.biometric"

        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: account + ".biometry.v2"
        ]

        SecItemDelete(query as CFDictionary)
        call.resolve(["success": true])
    }
}
