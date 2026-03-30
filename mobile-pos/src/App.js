import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider, SafeAreaView } from "react-native-safe-area-context";
import {
  StripeTerminalProvider,
  requestNeededAndroidPermissions,
  useStripeTerminal
} from "@stripe/stripe-terminal-react-native";
import {
  cancelTerminalPaymentIntent,
  createCardCheckout,
  createCashSale,
  createTerminalConnectionToken,
  createTerminalPaymentIntent,
  finalizeTerminalPaymentIntent,
  getAdminHealth,
  getProducts,
  loginAdmin
} from "./api";
import { config, normalizeBaseUrl, requireConfiguredBaseUrl } from "./config";
import { calculateSubtotal, formatMoney, getBookUnitsTotal, normalizeProductCategory } from "./utils";
import { theme } from "./theme";

const ADMIN_PASSWORD_KEY = "publishearts_mobile_admin_password";
const API_BASE_URL_KEY = "publishearts_mobile_api_base_url";
const DEFAULT_STATE = "NY";

const STATES = [
  "AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA",
  "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK",
  "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"
];

function buildCartPayload(rows) {
  return rows.map((row) => ({ id: row.id, quantity: row.quantity }));
}

function getReaderLabel(reader) {
  if (!reader) {
    return "Tap to Pay on this device";
  }
  return reader.label || (reader.deviceType === "tapToPay" ? "Tap to Pay on this device" : reader.deviceType || "connected reader");
}

async function ensureTapPermissions() {
  if (Platform.OS !== "android") {
    return;
  }

  const permissionError = await requestNeededAndroidPermissions({ accessFineLocation: true });
  if (permissionError) {
    throw new Error(permissionError.message || "Tap to Pay permissions were not granted on this device.");
  }
}

function Panel({ title, children }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SegmentButton({ active, label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.segment, active && styles.segmentActive]}>
      <Text style={[styles.segmentText, active && styles.segmentTextActive]}>{label}</Text>
    </Pressable>
  );
}

function QuantityButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={styles.qtyButton}>
      <Text style={styles.qtyButtonText}>{label}</Text>
    </Pressable>
  );
}

function ScreenHeader({ eyebrow, title, subtitle, actions }) {
  return (
    <View style={styles.topBar}>
      <View style={styles.topBarCopy}>
        <Text style={styles.eyebrow}>{eyebrow}</Text>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.metaText}>{subtitle}</Text> : null}
      </View>
      <View style={styles.topBarActions}>{actions}</View>
    </View>
  );
}

function LoginScreen({ apiBaseUrl, errorMessage, loading, onOpenSettings, onSubmit }) {
  const [password, setPassword] = useState("");

  return (
    <View style={styles.loginWrap}>
      <Text style={styles.eyebrow}>PublisHearts POS</Text>
      <Text style={styles.title}>Mobile POS Login</Text>
      <Text style={styles.copy}>Use the same admin password as the web POS.</Text>

      <Panel title="Server">
        <Text style={styles.metaText}>{apiBaseUrl || "No server URL configured yet."}</Text>
        <Pressable onPress={onOpenSettings} style={styles.ghostButton}>
          <Text style={styles.ghostButtonText}>Open Settings</Text>
        </Pressable>
      </Panel>

      <TextInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        style={styles.input}
        placeholder="Admin password"
        placeholderTextColor={theme.inkSoft}
      />

      <Pressable style={styles.primaryButton} disabled={loading} onPress={() => onSubmit(password)}>
        {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Open POS</Text>}
      </Pressable>

      {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
    </View>
  );
}

function SettingsScreen({
  apiBaseUrlDraft,
  loading,
  resolvedApiBaseUrl,
  statusIsError,
  statusMessage,
  onBack,
  onClearPassword,
  onRestoreBundledUrl,
  onSaveApiBaseUrl,
  onUpdateDraft
}) {
  const usingBundledDefault = normalizeBaseUrl(apiBaseUrlDraft) === "";

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <ScreenHeader
        eyebrow="Mobile POS"
        title="Settings"
        actions={
          <Pressable onPress={onBack} style={styles.ghostButton}>
            <Text style={styles.ghostButtonText}>Back</Text>
          </Pressable>
        }
      />

      <Panel title="Server URL">
        <Text style={styles.copy}>Use your computer's LAN IP for local testing, or your hosted app URL for remote use.</Text>
        <TextInput
          value={apiBaseUrlDraft}
          onChangeText={onUpdateDraft}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          placeholder={config.apiBaseUrl || "https://your-app.example.com"}
          placeholderTextColor={theme.inkSoft}
          style={styles.input}
        />
        <Pressable onPress={onSaveApiBaseUrl} style={styles.primaryButton} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.primaryButtonText}>Save Server URL</Text>}
        </Pressable>
        <Pressable onPress={onRestoreBundledUrl} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Use Bundled Default</Text>
        </Pressable>
        <Text style={styles.metaText}>
          {usingBundledDefault ? `Bundled default: ${config.apiBaseUrl || "not set"}` : `Saved override: ${resolvedApiBaseUrl}`}
        </Text>
      </Panel>

      <Panel title="Tap to Pay Build">
        <Text style={styles.copy}>Card-present checkout now uses Stripe Terminal through your backend.</Text>
        <Text style={styles.copy}>Expo Go is no longer enough for Tap to Pay. Install the downloadable preview build or production store build on your phone for card payments.</Text>
        <Text style={styles.copy}>Cash sales still work the same way in this app.</Text>
      </Panel>

      <Panel title="Session">
        <Pressable onPress={onClearPassword} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Clear Saved Login</Text>
        </Pressable>
      </Panel>

      {statusMessage ? <Text style={[styles.message, statusIsError && styles.errorText]}>{statusMessage}</Text> : null}
    </ScrollView>
  );
}

function PosScreen({ adminPassword, apiBaseUrl, onLogout, onOpenSettings }) {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [products, setProducts] = useState([]);
  const [health, setHealth] = useState(null);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [customerState, setCustomerState] = useState(DEFAULT_STATE);
  const [cashReceived, setCashReceived] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [receiptEmail, setReceiptEmail] = useState("");
  const [cart, setCart] = useState({});
  const [terminalMessage, setTerminalMessage] = useState("");
  const [terminalError, setTerminalError] = useState("");
  const [terminalConnectionStatus, setTerminalConnectionStatus] = useState("notConnected");
  const [terminalPaymentStatus, setTerminalPaymentStatus] = useState("notReady");
  const [initializingTerminal, setInitializingTerminal] = useState(true);
  const {
    collectPaymentMethod,
    connectedReader,
    disconnectReader,
    easyConnect,
    initialize,
    isInitialized,
    loading: terminalLoading,
    processPaymentIntent,
    retrievePaymentIntent,
    setTapToPayUxConfiguration
  } = useStripeTerminal({
    onDidAcceptTermsOfService: () => {
      setTerminalMessage("Tap to Pay terms accepted on this device.");
    },
    onDidChangeConnectionStatus: (status) => {
      setTerminalConnectionStatus(status);
    },
    onDidChangePaymentStatus: (status) => {
      setTerminalPaymentStatus(status);
    },
    onDidDisconnect: (reason) => {
      setTerminalMessage(reason ? `Tap to Pay disconnected (${reason}).` : "Tap to Pay disconnected.");
    }
  });

  async function loadPosData(showSpinner = false) {
    if (showSpinner) {
      setRefreshing(true);
    }
    try {
      const [productList, nextHealth] = await Promise.all([
        getProducts(adminPassword, apiBaseUrl),
        getAdminHealth(adminPassword, apiBaseUrl)
      ]);
      setProducts(productList);
      setHealth(nextHealth);
      setMessage("");
      setIsError(false);
    } catch (error) {
      setMessage(error.message || "Could not load mobile POS data.");
      setIsError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    loadPosData(false);
  }, [adminPassword, apiBaseUrl]);

  useEffect(() => {
    const serverHasTapToPay = Boolean(health?.terminalTapToPayEnabled && health?.terminalLocationId);
    if (!health) {
      return;
    }
    if (!serverHasTapToPay) {
      setInitializingTerminal(false);
      setTerminalError("");
      setTerminalMessage("");
      return;
    }

    let active = true;

    async function prepareTerminal() {
      setInitializingTerminal(true);
      setTerminalError("");
      try {
        const { error } = await initialize();
        if (!active) {
          return;
        }
        if (error) {
          throw error;
        }
        if (Platform.OS === "android") {
          const { error: uxError } = await setTapToPayUxConfiguration({
            tapZone: { indicator: "default" }
          });
          if (uxError && active) {
            setTerminalMessage(uxError.message || "Tap to Pay UX configuration could not be applied on this device.");
          }
        }
      } catch (error) {
        if (active) {
          setTerminalError(error.message || "Tap to Pay is unavailable in this build. Install a native dev build on the phone.");
        }
      } finally {
        if (active) {
          setInitializingTerminal(false);
        }
      }
    }

    prepareTerminal();

    return () => {
      active = false;
    };
  }, [health, initialize, setTapToPayUxConfiguration]);

  const rows = useMemo(() => {
    return products
      .filter((product) => Number(cart[product.id] || 0) > 0)
      .map((product) => ({ ...product, quantity: Number(cart[product.id] || 0) }));
  }, [cart, products]);

  const subtotalCents = useMemo(() => calculateSubtotal(rows), [rows]);
  const bookUnits = useMemo(() => getBookUnitsTotal(rows), [rows]);
  const totalCents = subtotalCents;
  const exactTotalAvailable = health?.taxMode !== "stripe_automatic";
  const stripeConfigured = Boolean(health?.stripeConfigured ?? health?.paymentsConfigured);
  const terminalEnabledOnServer = Boolean(health?.terminalTapToPayEnabled && health?.terminalLocationId);
  const cashReceivedCents = Number.isFinite(Number.parseFloat(cashReceived))
    ? Math.round(Number.parseFloat(cashReceived) * 100)
    : 0;
  const amountDeltaCents = Math.abs(cashReceivedCents - totalCents);
  const isCashShort = paymentMethod === "cash" && cashReceived !== "" && cashReceivedCents < totalCents;
  const terminalSdkStatus = terminalEnabledOnServer
    ? initializingTerminal
      ? "Initializing"
      : terminalError
        ? "Needs native build"
        : isInitialized
          ? "Ready"
          : "Unavailable"
    : "Waiting on server";

  function updateQuantity(productId, delta) {
    setCart((current) => {
      const nextQuantity = Math.max(0, Math.min(10, Number(current[productId] || 0) + delta));
      if (!nextQuantity) {
        const nextCart = { ...current };
        delete nextCart[productId];
        return nextCart;
      }
      return { ...current, [productId]: nextQuantity };
    });
  }

  function resetSale(messageText) {
    setCart({});
    setCashReceived("");
    setCustomerName("");
    setReceiptEmail("");
    setCustomerState(DEFAULT_STATE);
    setMessage(messageText);
    setIsError(false);
  }

  async function submitCashSale() {
    if (!rows.length) {
      setMessage("Add at least one item before recording a cash sale.");
      setIsError(true);
      return;
    }
    if (!exactTotalAvailable) {
      setMessage("Cash stays disabled while Stripe automatic tax is active.");
      setIsError(true);
      return;
    }
    if (cashReceivedCents < totalCents) {
      setMessage("Cash received must cover the sale total.");
      setIsError(true);
      return;
    }

    setSubmitting(true);
    setMessage("Recording cash sale...");
    setIsError(false);
    try {
      await createCashSale(adminPassword, {
        customerState,
        needsShipping: false,
        customerEmail: receiptEmail,
        customerName,
        cashReceivedCents,
        cart: buildCartPayload(rows)
      }, apiBaseUrl);
      await loadPosData(true);
      resetSale(`Cash sale recorded. Change due: ${formatMoney(amountDeltaCents)}.`);
    } catch (error) {
      setMessage(error.message || "Could not record cash sale.");
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function openBrowserCardCheckout(reason = "") {
    setSubmitting(true);
    setMessage(reason || "Opening browser card checkout...");
    setIsError(false);
    try {
      const payload = await createCardCheckout(adminPassword, {
        customerState,
        needsShipping: false,
        customerEmail: receiptEmail,
        customerName,
        cart: buildCartPayload(rows)
      }, apiBaseUrl);

      if (payload?.url) {
        await Linking.openURL(payload.url);
        setMessage(reason || "Browser checkout opened.");
      } else {
        throw new Error("Checkout session created, but no checkout URL was returned.");
      }
    } catch (error) {
      setMessage(error.message || "Could not start card checkout.");
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function ensureTapToPayReady() {
    if (terminalError) {
      throw new Error(terminalError);
    }
    if (initializingTerminal || !isInitialized) {
      throw new Error("Tap to Pay is still initializing on this device. Try again in a moment.");
    }
    if (!terminalEnabledOnServer) {
      throw new Error("Tap to Pay is not enabled on the server yet. Add STRIPE_TERMINAL_LOCATION_ID first.");
    }

    await ensureTapPermissions();

    if (connectedReader) {
      return connectedReader;
    }

    const { error, reader } = await easyConnect({
      discoveryMethod: "tapToPay",
      locationId: health.terminalLocationId,
      autoReconnectOnUnexpectedDisconnect: true,
      merchantDisplayName: "PublisHearts",
      tosAcceptancePermitted: true,
      simulated: false
    });

    if (error) {
      throw new Error(error.message || "Could not connect Tap to Pay on this device.");
    }

    const activeReader = reader || connectedReader;
    setTerminalMessage(`Connected to ${getReaderLabel(activeReader)}.`);
    return activeReader;
  }

  async function startCardFlow() {
    if (!rows.length) {
      setMessage("Add at least one item before starting card checkout.");
      setIsError(true);
      return;
    }

    if (!terminalEnabledOnServer) {
      await openBrowserCardCheckout("Tap to Pay is not enabled on the server yet. Falling back to browser checkout.");
      return;
    }

    const receiptEmailValue = receiptEmail;
    let paymentIntentId = "";
    let paymentCaptured = false;

    setSubmitting(true);
    setMessage("Preparing Tap to Pay...");
    setIsError(false);
    try {
      const activeReader = await ensureTapToPayReady();

      const paymentIntentPayload = await createTerminalPaymentIntent(adminPassword, {
        customerState,
        needsShipping: false,
        customerEmail: receiptEmailValue,
        customerName,
        cart: buildCartPayload(rows)
      }, apiBaseUrl);

      paymentIntentId = paymentIntentPayload.paymentIntentId;
      setMessage(`Ready for tap on ${getReaderLabel(activeReader)}.`);

      const retrieveResult = await retrievePaymentIntent(paymentIntentPayload.clientSecret);
      if (retrieveResult.error || !retrieveResult.paymentIntent) {
        throw new Error(retrieveResult.error?.message || "Could not load the in-person payment.");
      }

      const collectResult = await collectPaymentMethod({
        paymentIntent: retrieveResult.paymentIntent,
        customerCancellation: "enableIfAvailable"
      });
      if (collectResult.error || !collectResult.paymentIntent) {
        throw new Error(collectResult.error?.message || "Customer tap was not collected.");
      }

      setMessage("Processing payment...");

      const processResult = await processPaymentIntent({
        paymentIntent: collectResult.paymentIntent,
        customerCancellation: "enableIfAvailable"
      });
      if (processResult.error || !processResult.paymentIntent) {
        throw new Error(processResult.error?.message || "Stripe could not process the tap payment.");
      }
      if (processResult.paymentIntent.status !== "succeeded") {
        throw new Error(`Payment ended in ${processResult.paymentIntent.status || "an incomplete"} status.`);
      }

      paymentCaptured = true;

      const finalized = await finalizeTerminalPaymentIntent(adminPassword, paymentIntentId, apiBaseUrl);
      await loadPosData(true);
      setTerminalMessage(`Payment complete on ${getReaderLabel(activeReader)}.`);
      resetSale(
        finalized.emailed
          ? `Card payment complete. Receipt emailed to ${finalized.email || receiptEmailValue}.`
          : "Card payment complete."
      );
    } catch (error) {
      if (paymentIntentId && !paymentCaptured) {
        await cancelTerminalPaymentIntent(adminPassword, paymentIntentId, apiBaseUrl).catch(() => {});
      }

      if (paymentCaptured) {
        setMessage(`Payment succeeded, but the order could not be finalized in the app. Do not charge again. ${error.message || ""}`.trim());
      } else {
        setMessage(error.message || "Tap to Pay failed.");
      }
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDisconnectReader() {
    setSubmitting(true);
    setMessage("Disconnecting Tap to Pay...");
    setIsError(false);
    try {
      const result = await disconnectReader();
      if (result?.error) {
        throw result.error;
      }
      setTerminalMessage("Tap to Pay disconnected.");
      setMessage("Tap to Pay disconnected.");
    } catch (error) {
      setMessage(error.message || "Could not disconnect Tap to Pay.");
      setIsError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.accentStrong} />
        <Text style={styles.copy}>Loading POS...</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.screen} keyboardShouldPersistTaps="handled">
      <ScreenHeader
        eyebrow="Mobile POS"
        title="In-Person Register"
        subtitle={apiBaseUrl}
        actions={
          <>
            <Pressable onPress={onOpenSettings} style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>Settings</Text>
            </Pressable>
            <Pressable onPress={onLogout} style={styles.ghostButton}>
              <Text style={styles.ghostButtonText}>Log Out</Text>
            </Pressable>
          </>
        }
      />

      <Panel title="Status">
        <View style={styles.totalRow}>
          <Text style={styles.copy}>Tax Mode</Text>
          <Text style={styles.copy}>{health?.taxMode || "unknown"}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.copy}>Stripe</Text>
          <Text style={styles.copy}>{stripeConfigured ? "Configured" : "Check web admin"}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.copy}>Tap to Pay Server</Text>
          <Text style={styles.copy}>{terminalEnabledOnServer ? "Enabled" : "Needs location ID"}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.copy}>Terminal SDK</Text>
          <Text style={styles.copy}>{terminalSdkStatus}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.copy}>Connection</Text>
          <Text style={styles.copy}>{terminalConnectionStatus}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.copy}>Reader</Text>
          <Text style={styles.copy}>{getReaderLabel(connectedReader)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.copy}>Payment State</Text>
          <Text style={styles.copy}>{terminalPaymentStatus}</Text>
        </View>
        {terminalMessage ? <Text style={styles.message}>{terminalMessage}</Text> : null}
        {terminalEnabledOnServer && terminalError ? <Text style={styles.errorText}>{terminalError}</Text> : null}
        {connectedReader ? (
          <Pressable onPress={handleDisconnectReader} style={styles.secondaryButton} disabled={submitting}>
            <Text style={styles.secondaryButtonText}>Disconnect Tap to Pay</Text>
          </Pressable>
        ) : null}
        <Pressable onPress={() => loadPosData(true)} style={styles.secondaryButton} disabled={refreshing}>
          {refreshing ? <ActivityIndicator color={theme.accentStrong} /> : <Text style={styles.secondaryButtonText}>Refresh POS Data</Text>}
        </Pressable>
      </Panel>

      <Panel title="Sale Setup">
        <Text style={styles.label}>Payment Method</Text>
        <View style={styles.segmentRow}>
          <SegmentButton active={paymentMethod === "cash"} label="Cash" onPress={() => setPaymentMethod("cash")} />
          <SegmentButton active={paymentMethod === "card"} label="Card" onPress={() => setPaymentMethod("card")} />
        </View>

        <Text style={styles.label}>Customer Name</Text>
        <TextInput
          value={customerName}
          onChangeText={setCustomerName}
          autoCapitalize="words"
          placeholder="Customer name"
          placeholderTextColor={theme.inkSoft}
          style={styles.input}
        />

        <Text style={styles.label}>Receipt Email</Text>
        <TextInput
          value={receiptEmail}
          onChangeText={setReceiptEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="customer@example.com"
          placeholderTextColor={theme.inkSoft}
          style={styles.input}
        />

        <Text style={styles.label}>Tax State</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stateRow}>
          {STATES.map((entry) => (
            <Pressable
              key={entry}
              onPress={() => setCustomerState(entry)}
              style={[styles.stateChip, customerState === entry && styles.stateChipActive]}
            >
              <Text style={[styles.stateChipText, customerState === entry && styles.stateChipTextActive]}>{entry}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {paymentMethod === "cash" ? (
          <>
            <Text style={styles.label}>Cash Received</Text>
            <TextInput
              value={cashReceived}
              onChangeText={setCashReceived}
              keyboardType="decimal-pad"
              placeholder="0.00"
              placeholderTextColor={theme.inkSoft}
              style={styles.input}
            />
            <View style={styles.cashRow}>
              <Text style={styles.cashLabel}>{isCashShort ? "Still Due" : "Change Due"}</Text>
              <Text style={[styles.cashValue, isCashShort && styles.cashValueWarn]}>{formatMoney(amountDeltaCents)}</Text>
            </View>
          </>
        ) : (
          <View style={styles.noticeBox}>
            <Text style={styles.noticeTitle}>{terminalEnabledOnServer ? "Card today: Tap to Pay" : "Card fallback: browser checkout"}</Text>
            <Text style={styles.copy}>
              {terminalEnabledOnServer
                ? "The card button now uses Stripe Terminal and keeps the payment inside the app on supported native builds."
                : "Terminal is not enabled on the server yet, so the card button will open the browser checkout instead."}
            </Text>
          </View>
        )}
      </Panel>

      <Panel title="Catalog">
        {products.length ? products.map((product) => {
          const quantity = Number(cart[product.id] || 0);
          return (
            <View key={product.id} style={styles.productRow}>
              <View style={styles.productCopy}>
                <View style={styles.productHeader}>
                  <Text style={styles.productTitle}>{product.title}</Text>
                  <Text style={styles.productPrice}>{formatMoney(product.priceCents)}</Text>
                </View>
                <Text style={styles.metaText}>
                  {normalizeProductCategory(product.productCategory) === "merch" ? "Merch" : "Book"}
                </Text>
              </View>
              <View style={styles.qtyWrap}>
                <QuantityButton label="-" onPress={() => updateQuantity(product.id, -1)} />
                <Text style={styles.qtyValue}>{quantity}</Text>
                <QuantityButton label="+" onPress={() => updateQuantity(product.id, 1)} />
              </View>
            </View>
          );
        }) : <Text style={styles.copy}>No products loaded yet.</Text>}
      </Panel>

      <Panel title="Totals">
        <View style={styles.totalRow}>
          <Text style={styles.copy}>Items</Text>
          <Text style={styles.copy}>{formatMoney(subtotalCents)}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.copy}>Book Counter Units</Text>
          <Text style={styles.copy}>{bookUnits}</Text>
        </View>
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total</Text>
          <Text style={styles.totalValue}>{formatMoney(totalCents)}</Text>
        </View>
      </Panel>

      <Pressable
        style={[styles.primaryButton, (submitting || terminalLoading) && styles.buttonDisabled]}
        disabled={submitting || terminalLoading}
        onPress={paymentMethod === "cash" ? submitCashSale : startCardFlow}
      >
        {submitting || terminalLoading ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.primaryButtonText}>
            {paymentMethod === "cash" ? "Record Cash Sale" : terminalEnabledOnServer ? "Take Tap Payment" : "Open Card Checkout"}
          </Text>
        )}
      </Pressable>

      {message ? <Text style={[styles.message, isError && styles.errorText]}>{message}</Text> : null}
    </ScrollView>
  );
}

function AuthenticatedShell({
  adminPassword,
  apiBaseUrl,
  showSettings,
  apiBaseUrlDraft,
  loading,
  resolvedApiBaseUrl,
  statusIsError,
  statusMessage,
  onBack,
  onClearPassword,
  onLogout,
  onOpenSettings,
  onRestoreBundledUrl,
  onSaveApiBaseUrl,
  onUpdateDraft
}) {
  const fetchTokenProvider = useCallback(async () => {
    const payload = await createTerminalConnectionToken(adminPassword, {}, apiBaseUrl);
    return payload.secret;
  }, [adminPassword, apiBaseUrl]);

  return (
    <StripeTerminalProvider logLevel="verbose" tokenProvider={fetchTokenProvider}>
      {showSettings ? (
        <SettingsScreen
          apiBaseUrlDraft={apiBaseUrlDraft}
          loading={loading}
          resolvedApiBaseUrl={resolvedApiBaseUrl}
          statusIsError={statusIsError}
          statusMessage={statusMessage}
          onBack={onBack}
          onClearPassword={onClearPassword}
          onRestoreBundledUrl={onRestoreBundledUrl}
          onSaveApiBaseUrl={onSaveApiBaseUrl}
          onUpdateDraft={onUpdateDraft}
        />
      ) : (
        <PosScreen
          adminPassword={adminPassword}
          apiBaseUrl={apiBaseUrl}
          onLogout={onLogout}
          onOpenSettings={onOpenSettings}
        />
      )}
    </StripeTerminalProvider>
  );
}

function Root() {
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [statusIsError, setStatusIsError] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [apiBaseUrlDraft, setApiBaseUrlDraft] = useState("");
  const [apiBaseUrlOverride, setApiBaseUrlOverride] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([AsyncStorage.getItem(ADMIN_PASSWORD_KEY), AsyncStorage.getItem(API_BASE_URL_KEY)])
      .then(([savedPassword, savedApiBaseUrl]) => {
        if (!active) {
          return;
        }
        setAdminPassword(savedPassword || "");
        setApiBaseUrlOverride(savedApiBaseUrl || "");
        setApiBaseUrlDraft(savedApiBaseUrl || "");
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const resolvedApiBaseUrl = useMemo(() => {
    try {
      return requireConfiguredBaseUrl(apiBaseUrlOverride);
    } catch {
      return "";
    }
  }, [apiBaseUrlOverride]);

  async function handleLogin(password) {
    const trimmed = String(password || "").trim();
    if (!trimmed) {
      setErrorMessage("Enter the admin password.");
      return;
    }
    if (!resolvedApiBaseUrl) {
      setErrorMessage("Set the mobile server URL in Settings first.");
      setShowSettings(true);
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setStatusMessage("");
    try {
      await loginAdmin(trimmed, resolvedApiBaseUrl);
      await AsyncStorage.setItem(ADMIN_PASSWORD_KEY, trimmed);
      setAdminPassword(trimmed);
      setShowSettings(false);
    } catch (error) {
      setErrorMessage(error.message || "Could not sign in.");
    } finally {
      setLoading(false);
    }
  }

  async function handleSaveApiBaseUrl() {
    const normalized = normalizeBaseUrl(apiBaseUrlDraft);
    setLoading(true);
    setStatusMessage("");
    setStatusIsError(false);
    try {
      if (normalized) {
        await AsyncStorage.setItem(API_BASE_URL_KEY, normalized);
        setApiBaseUrlOverride(normalized);
        setApiBaseUrlDraft(normalized);
        setStatusMessage("Server URL saved.");
      } else {
        await AsyncStorage.removeItem(API_BASE_URL_KEY);
        setApiBaseUrlOverride("");
        setApiBaseUrlDraft("");
        setStatusMessage("Using bundled default URL.");
      }
    } catch (error) {
      setStatusMessage(error.message || "Could not save the server URL.");
      setStatusIsError(true);
    } finally {
      setLoading(false);
    }
  }

  async function handleClearPassword() {
    await AsyncStorage.removeItem(ADMIN_PASSWORD_KEY);
    setAdminPassword("");
    setStatusMessage("Saved login cleared.");
    setStatusIsError(false);
  }

  async function handleLogout() {
    await AsyncStorage.removeItem(ADMIN_PASSWORD_KEY);
    setAdminPassword("");
  }

  if (!ready) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={styles.safeArea}>
          <StatusBar barStyle="dark-content" />
          <View style={styles.centered}>
            <ActivityIndicator color={theme.accentStrong} />
          </View>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" />
        {adminPassword ? (
          <AuthenticatedShell
            adminPassword={adminPassword}
            apiBaseUrl={resolvedApiBaseUrl}
            showSettings={showSettings}
            apiBaseUrlDraft={apiBaseUrlDraft}
            loading={loading}
            resolvedApiBaseUrl={resolvedApiBaseUrl}
            statusIsError={statusIsError}
            statusMessage={statusMessage}
            onBack={() => setShowSettings(false)}
            onClearPassword={handleClearPassword}
            onLogout={handleLogout}
            onOpenSettings={() => setShowSettings(true)}
            onRestoreBundledUrl={() => setApiBaseUrlDraft("")}
            onSaveApiBaseUrl={handleSaveApiBaseUrl}
            onUpdateDraft={setApiBaseUrlDraft}
          />
        ) : showSettings ? (
          <SettingsScreen
            apiBaseUrlDraft={apiBaseUrlDraft}
            loading={loading}
            resolvedApiBaseUrl={resolvedApiBaseUrl}
            statusIsError={statusIsError}
            statusMessage={statusMessage}
            onBack={() => setShowSettings(false)}
            onClearPassword={handleClearPassword}
            onRestoreBundledUrl={() => setApiBaseUrlDraft("")}
            onSaveApiBaseUrl={handleSaveApiBaseUrl}
            onUpdateDraft={setApiBaseUrlDraft}
          />
        ) : (
          <LoginScreen
            apiBaseUrl={resolvedApiBaseUrl}
            errorMessage={errorMessage}
            loading={loading}
            onOpenSettings={() => setShowSettings(true)}
            onSubmit={handleLogin}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default Root;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.bg },
  screen: { padding: 16, gap: 14 },
  loginWrap: { flex: 1, padding: 24, justifyContent: "center", gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 10 },
  topBar: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12 },
  topBarCopy: { flex: 1, gap: 4 },
  topBarActions: { gap: 8 },
  eyebrow: { color: theme.accentStrong, textTransform: "uppercase", letterSpacing: 1.6, fontWeight: "700", fontSize: 12 },
  title: { color: theme.ink, fontWeight: "800", fontSize: 28, marginTop: 4 },
  copy: { color: theme.inkSoft, fontSize: 15, lineHeight: 22 },
  panel: { borderWidth: 1, borderColor: theme.line, backgroundColor: theme.panel, borderRadius: 18, padding: 14, gap: 10 },
  panelTitle: { color: theme.ink, fontSize: 18, fontWeight: "700" },
  label: { color: theme.ink, fontWeight: "700", marginTop: 6 },
  input: { borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, backgroundColor: "#fff", color: theme.ink },
  segmentRow: { flexDirection: "row", gap: 8 },
  segment: { flex: 1, borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingVertical: 12, alignItems: "center", backgroundColor: "#fff" },
  segmentActive: { borderColor: theme.accentStrong, backgroundColor: "#fff0e8" },
  segmentText: { color: theme.ink, fontWeight: "700" },
  segmentTextActive: { color: theme.accentStrong },
  stateRow: { gap: 8, paddingVertical: 2 },
  stateChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: theme.line, backgroundColor: "#fff" },
  stateChipActive: { backgroundColor: "#fff0e8", borderColor: theme.accentStrong },
  stateChipText: { color: theme.ink, fontWeight: "700" },
  stateChipTextActive: { color: theme.accentStrong },
  productRow: { flexDirection: "row", justifyContent: "space-between", gap: 12, alignItems: "center", borderWidth: 1, borderColor: theme.line, borderRadius: 14, padding: 12, backgroundColor: "#fff" },
  productCopy: { flex: 1, gap: 4 },
  productHeader: { flexDirection: "row", justifyContent: "space-between", gap: 8 },
  productTitle: { flex: 1, color: theme.ink, fontWeight: "700", fontSize: 15 },
  productPrice: { color: theme.ink, fontWeight: "700" },
  metaText: { color: theme.inkSoft, fontSize: 13, lineHeight: 18 },
  qtyWrap: { flexDirection: "row", alignItems: "center", gap: 8 },
  qtyButton: { width: 34, height: 34, borderRadius: 10, backgroundColor: "#f4ebe1", alignItems: "center", justifyContent: "center" },
  qtyButtonText: { fontSize: 20, fontWeight: "700", color: theme.accentStrong },
  qtyValue: { minWidth: 18, textAlign: "center", color: theme.ink, fontWeight: "700" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", gap: 12 },
  totalLabel: { color: theme.ink, fontWeight: "800", fontSize: 16 },
  totalValue: { color: theme.ink, fontWeight: "800", fontSize: 16 },
  cashRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 12, borderRadius: 12, backgroundColor: "#fff4ec" },
  cashLabel: { color: theme.ink, fontWeight: "700" },
  cashValue: { color: theme.success, fontWeight: "800", fontSize: 18 },
  cashValueWarn: { color: theme.warn },
  noticeBox: { padding: 12, borderRadius: 12, backgroundColor: "#fff7ef", borderWidth: 1, borderColor: "#f0dcc2", gap: 6 },
  noticeTitle: { color: theme.ink, fontWeight: "800" },
  primaryButton: { minHeight: 52, borderRadius: 14, backgroundColor: theme.accentStrong, alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  secondaryButton: { minHeight: 48, borderRadius: 14, borderWidth: 1, borderColor: theme.line, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", paddingHorizontal: 18 },
  secondaryButtonText: { color: theme.accentStrong, fontWeight: "800", fontSize: 15 },
  primaryButtonText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  ghostButton: { borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: "#fff" },
  ghostButtonText: { color: theme.ink, fontWeight: "700" },
  buttonDisabled: { opacity: 0.6 },
  message: { color: theme.success, fontSize: 14, lineHeight: 20 },
  errorText: { color: theme.danger, fontSize: 14, lineHeight: 20 }
});
