import { intervalToDuration, isBefore, set } from "date-fns";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useState } from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { TimeSegment } from "../../components/TimeSegment";
import { theme } from "../../theme";
import { registerForPushNotificationsAsync } from "../../utils/registerForPushNotificationsAsync";
import { getFromStorage, saveToStorage } from "../../utils/storage";

type CountdownStatus = {
  isOverdue: boolean;
  distance: ReturnType<typeof intervalToDuration>;
};

export type PersistedCountdownState = {
  currentNotificationId: string | undefined;
  completedAtTimestamps: number[];
};

export const countdownStorageKey = "taskly-countdown";

// 10 seconds in milliseconds from now
const frequency = 10 * 1000;

export default function CounterScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [countdownState, setCountdownState] =
    useState<PersistedCountdownState>();
  const [status, setStatus] = useState<CountdownStatus>({
    isOverdue: false,
    distance: {},
  });

  const lastCompletedTimestamp = countdownState?.completedAtTimestamps[0];

  const scheduleNotification = async () => {
    let pushNotificationid;
    const result = await registerForPushNotificationsAsync();
    if (result === "granted") {
      pushNotificationid = await Notifications.scheduleNotificationAsync({
        content: {
          title: "The thing is due!",
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
          seconds: frequency / 1000,
        },
      });
    } else {
      if (Device.isDevice) {
        Alert.alert(
          "Unable to schedule notification",
          "Enable the notification permission for Expo Go in settings"
        );
      }
    }

    if (countdownState?.currentNotificationId) {
      await Notifications.cancelScheduledNotificationAsync(
        countdownState?.currentNotificationId
      );
    }

    const newCountdownState: PersistedCountdownState = {
      currentNotificationId: pushNotificationid,
      completedAtTimestamps: countdownState
        ? [Date.now(), ...countdownState.completedAtTimestamps]
        : [Date.now()],
    };
    setCountdownState(newCountdownState);
    await saveToStorage(countdownStorageKey, newCountdownState);
  };

  useEffect(() => {
    const init = async () => {
      const value = await getFromStorage(countdownStorageKey);
      setCountdownState(value);
      setIsLoading(false);
    };
    init();
  }, []);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const timestamp = lastCompletedTimestamp
        ? lastCompletedTimestamp + frequency
        : Date.now();

      if (lastCompletedTimestamp) {
        setIsLoading(false);
      }

      const isOverdue = isBefore(timestamp, Date.now());
      const distance = intervalToDuration(
        isOverdue
          ? { start: timestamp, end: Date.now() }
          : { start: Date.now(), end: timestamp }
      );
      setStatus({ isOverdue, distance });
    }, 1000);

    return () => {
      clearInterval(intervalId);
    };
  }, [lastCompletedTimestamp]);

  if (isLoading) {
    return (
      <View style={styles.activityIndicatorContainer}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        status.isOverdue ? styles.containerLate : undefined,
      ]}
    >
      {status.isOverdue ? (
        <Text
          style={[
            styles.heading,
            status.isOverdue ? styles.whiteText : undefined,
          ]}
        >
          Thing overdue by
        </Text>
      ) : (
        <Text
          style={[
            styles.heading,
            status.isOverdue ? styles.whiteText : undefined,
          ]}
        >
          Thing due in...
        </Text>
      )}
      <View style={styles.row}>
        <TimeSegment
          unit="Days"
          number={status.distance.days ?? 0}
          textStyle={status.isOverdue ? styles.whiteText : undefined}
        />
        <TimeSegment
          unit="Hours"
          number={status.distance.hours ?? 0}
          textStyle={status.isOverdue ? styles.whiteText : undefined}
        />
        <TimeSegment
          unit="Minutes"
          number={status.distance.minutes ?? 0}
          textStyle={status.isOverdue ? styles.whiteText : undefined}
        />
        <TimeSegment
          unit="Seconds"
          number={status.distance.seconds ?? 0}
          textStyle={status.isOverdue ? styles.whiteText : undefined}
        />
      </View>
      <TouchableOpacity
        style={styles.button}
        activeOpacity={0.8}
        onPress={scheduleNotification}
      >
        <Text style={styles.buttonText}>I've done the thing!</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  containerLate: {
    backgroundColor: theme.colorRed,
  },
  button: {
    backgroundColor: theme.colorBlack,
    padding: 12,
    borderRadius: 6,
  },
  buttonText: {
    fontWeight: "bold",
    color: theme.colorWhite,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  row: {
    flexDirection: "row",
    marginBottom: 24,
  },
  heading: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
  },
  whiteText: {
    color: theme.colorWhite,
  },
  activityIndicatorContainer: {
    backgroundColor: theme.colorWhite,
    justifyContent: "center",
    alignItems: "center",
    flex: 1,
  },
});
