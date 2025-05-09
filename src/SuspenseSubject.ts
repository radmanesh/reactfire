import { empty, Observable, Subject, Subscriber, Subscription } from 'rxjs';
import { catchError, shareReplay, tap } from 'rxjs/operators';
import { ObservableStatus } from './useObservable';

export class SuspenseSubject<T> extends Subject<T> {
  private _value: T | undefined;
  private _hasValue = false;
  private _timeoutHandler: NodeJS.Timeout;
  private _firstEmission: Promise<void>;
  private _error: any = undefined;
  private _innerObservable: Observable<T>;
  private _warmupSubscription: Subscription;
  private _immutableStatus: ObservableStatus<T>;
  private _isComplete = false;

  // @ts-expect-error: TODO: double check to see if this is an RXJS thing or if we should listen to TS
  private _innerSubscriber: Subscription;
  // @ts-expect-error: TODO: double check to see if this is an RXJS thing or if we should listen to TS
  private _resolveFirstEmission: () => void;

  constructor(
    innerObservable: Observable<T>,
    private _timeoutWindow: number,
    private _suspenseEnabled: boolean,
  ) {
    super();
    this._firstEmission = new Promise<void>((resolve) => (this._resolveFirstEmission = resolve));

    this._immutableStatus = {
      status: 'loading',
      hasEmitted: false,
      isComplete: false,
      data: undefined,
      error: undefined,
      firstValuePromise: this._firstEmission,
    };

    this._innerObservable = innerObservable.pipe(
      tap({
        next: (v) => {
          this._next(v);
        },
        error: (e) => {
          // save the error, so that we can raise on subscription or .value
          // resolve the promise, so suspense tries again
          this._error = e;
          this._resolveFirstEmission();
          this._updateImmutableStatus();
        },
        complete: () => {
          this._isComplete = true;
          this._updateImmutableStatus();
        },
      }),
      catchError(() => empty()),
      shareReplay(1),
    );
    // warm up the observable
    this._warmupSubscription = this._innerObservable.subscribe();

    // set a timeout for resetting the cache, subscriptions will cancel the timeout
    // and reschedule again on unsubscribe
    if (this._suspenseEnabled) {
      // Noop if suspense is enabled
      this._timeoutHandler = setTimeout(() => {}, this._timeoutWindow);
    } else {
      this._timeoutHandler = setTimeout(this._reset.bind(this), this._timeoutWindow);
    }
  }

  get hasValue(): boolean {
    // hasValue returns true if there's an error too
    // so that after we resolve the promise & useObservable is called again
    // we won't throw again
    return this._hasValue || !!this._error;
  }

  get value(): T {
    // TODO figure out how to reset the cache here, if I _reset() here before throwing
    // it doesn't seem to work.
    // As it is now, this will burn the cache entry until the timeout fires.
    if (this._error) {
      throw this._error;
    } else if (!this.hasValue) {
      throw Error('Can only get value if SuspenseSubject has a value');
    }
    return this._value as T;
  }

  get firstEmission(): Promise<void> {
    return this._firstEmission;
  }

  private _updateImmutableStatus() {
    // @ts-expect-error
    // TS fails here because ObservableStatus defines specific
    // relationships between the fields. This is difficult to
    // code for here, so the relationships between the ObservableStatus fields
    // are mostly checked in tests instead
    this._immutableStatus = {
      status: this._error ? 'error' : this._hasValue ? 'success' : 'loading',
      hasEmitted: this._hasValue,
      isComplete: this._isComplete,
      data: this._value,
      error: this._error,
      firstValuePromise: this._firstEmission,
    };
  }

  private _next(value: T) {
    this._hasValue = true;
    this._value = value;
    this._resolveFirstEmission();
    this._updateImmutableStatus();
  }

  private _reset() {
    // seems to be undefined in tests?
    if (this._warmupSubscription) {
      this._warmupSubscription.unsubscribe();
    }
    this._hasValue = false;
    this._value = undefined;
    this._error = undefined;
    this._firstEmission = new Promise<void>((resolve) => (this._resolveFirstEmission = resolve));
    this._updateImmutableStatus();
  }

  _subscribe(subscriber: Subscriber<T>): Subscription {
    if (this._timeoutHandler) {
      clearTimeout(this._timeoutHandler);
    }
    this._innerSubscriber = this._innerObservable.subscribe(subscriber);
    return this._innerSubscriber;
  }

  get ourError() {
    return this._error;
  }

  get immutableStatus() {
    return this._immutableStatus;
  }
}
