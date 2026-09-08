#include <ApplicationServices/ApplicationServices.h>
#include <signal.h>
#include <stdio.h>

static const char *event_name(CGEventType type) {
  switch (type) {
    case kCGEventLeftMouseDown:
      return "leftMouseDown";
    case kCGEventLeftMouseDragged:
      return "leftMouseDragged";
    case kCGEventLeftMouseUp:
      return "leftMouseUp";
    case kCGEventTapDisabledByTimeout:
      return "tapDisabledByTimeout";
    case kCGEventTapDisabledByUserInput:
      return "tapDisabledByUserInput";
    default:
      return "other";
  }
}

static CGEventRef observe_mouse(
    CGEventTapProxy proxy,
    CGEventType type,
    CGEventRef event,
    void *user_info) {
  (void)proxy;
  (void)user_info;

  CGPoint location = CGEventGetLocation(event);
  int64_t button = CGEventGetIntegerValueField(event, kCGMouseEventButtonNumber);
  printf("%llu %-22s button=%lld x=%.0f y=%.0f\n",
         CGEventGetTimestamp(event), event_name(type), button,
         location.x, location.y);
  fflush(stdout);
  return event;
}

int main(void) {
  CGEventMask mask = CGEventMaskBit(kCGEventLeftMouseDown) |
                     CGEventMaskBit(kCGEventLeftMouseDragged) |
                     CGEventMaskBit(kCGEventLeftMouseUp);
  CFMachPortRef tap = CGEventTapCreate(
      kCGSessionEventTap,
      kCGHeadInsertEventTap,
      kCGEventTapOptionListenOnly,
      mask,
      observe_mouse,
      NULL);

  if (tap == NULL) {
    fputs("Unable to create listen-only mouse event tap.\n", stderr);
    return 2;
  }

  CFRunLoopSourceRef source =
      CFMachPortCreateRunLoopSource(kCFAllocatorDefault, tap, 0);
  CFRunLoopAddSource(CFRunLoopGetCurrent(), source, kCFRunLoopCommonModes);
  CGEventTapEnable(tap, true);
  puts("READY: listening for left mouse down, drag, and up events");
  fflush(stdout);
  CFRunLoopRun();

  CFRelease(source);
  CFRelease(tap);
  return 0;
}
