import React, {
	forwardRef,
	MutableRefObject,
	useCallback,
	useImperativeHandle,
	useMemo,
	useRef,
	useState,
} from 'react';
import {
	CompositionManagerContext,
	CompProps,
	Internals,
	LooseAnyComponent,
	MediaVolumeContextValue,
	SetMediaVolumeContextValue,
	SetTimelineContextValue,
	TimelineContextValue,
} from 'remotion';
import {PlayerEventEmitterContext} from './emitter-context';
import {PlayerEmitter} from './event-emitter';
import {PLAYER_CSS_CLASSNAME} from './player-css-classname';
import {PlayerRef} from './player-methods';
import PlayerUI from './PlayerUI';
import {getPreferredVolume, persistVolume} from './volume-persistance';

type PropsIfHasProps<Props> = {} extends Props
	? {
			inputProps?: Props;
	  }
	: {
			inputProps: Props;
	  };

export type PlayerProps<T> = {
	durationInFrames: number;
	compositionWidth: number;
	compositionHeight: number;
	fps: number;
	showVolumeControls?: boolean;
	controls?: boolean;
	style?: React.CSSProperties;
	loop?: boolean;
	autoPlay?: boolean;
	allowFullscreen?: boolean;
	clickToPlay?: boolean;
	doubleClickToFullscreen?: boolean;
	inputProps?: unknown;
} & PropsIfHasProps<T> &
	CompProps<T>;

Internals.CSSUtils.injectCSS(
	Internals.CSSUtils.makeDefaultCSS(`.${PLAYER_CSS_CLASSNAME}`)
);

export const PlayerFn = <T,>(
	{
		durationInFrames,
		compositionHeight,
		compositionWidth,
		fps,
		inputProps,
		style,
		controls = false,
		loop = false,
		autoPlay = false,
		showVolumeControls = true,
		allowFullscreen = true,
		clickToPlay = true,
		doubleClickToFullscreen = true,
		...componentProps
	}: PlayerProps<T>,
	ref: MutableRefObject<PlayerRef>
) => {
	const component = Internals.useLazyComponent(componentProps);
	const [frame, setFrame] = useState(0);
	const [playing, setPlaying] = useState<boolean>(false);
	const [rootId] = useState<string>('player-comp');
	const [emitter] = useState(() => new PlayerEmitter());
	const rootRef = useRef<PlayerRef>(null);
	const [mediaMuted, setMediaMuted] = useState<boolean>(false);
	const [mediaVolume, setMediaVolume] = useState<number>(getPreferredVolume());

	if (typeof compositionHeight !== 'number') {
		throw new TypeError(
			`'compositionHeight' must be a number but got '${typeof compositionHeight}' instead`
		);
	}

	if (typeof compositionWidth !== 'number') {
		throw new TypeError(
			`'compositionWidth' must be a number but got '${typeof compositionWidth}' instead`
		);
	}

	Internals.validateDimension(compositionHeight, 'compositionHeight');
	Internals.validateDimension(compositionWidth, 'compositionWidth');
	Internals.validateDurationInFrames(durationInFrames);
	Internals.validateFps(fps);

	if (typeof controls !== 'boolean' && typeof controls !== 'undefined') {
		throw new TypeError(
			`'controls' must be a boolean or undefined but got '${typeof controls}' instead`
		);
	}

	if (typeof autoPlay !== 'boolean' && typeof autoPlay !== 'undefined') {
		throw new TypeError(
			`'autoPlay' must be a boolean or undefined but got '${typeof autoPlay}' instead`
		);
	}

	if (typeof loop !== 'boolean' && typeof loop !== 'undefined') {
		throw new TypeError(
			`'loop' must be a boolean or undefined but got '${typeof loop}' instead`
		);
	}

	if (
		typeof doubleClickToFullscreen !== 'boolean' &&
		typeof doubleClickToFullscreen !== 'undefined'
	) {
		throw new TypeError(
			`'doubleClickToFullscreen' must be a boolean or undefined but got '${typeof doubleClickToFullscreen}' instead`
		);
	}

	if (
		typeof showVolumeControls !== 'boolean' &&
		typeof showVolumeControls !== 'undefined'
	) {
		throw new TypeError(
			`'showVolumeControls' must be a boolean or undefined but got '${typeof showVolumeControls}' instead`
		);
	}

	if (
		typeof allowFullscreen !== 'boolean' &&
		typeof allowFullscreen !== 'undefined'
	) {
		throw new TypeError(
			`'allowFullscreen' must be a boolean or undefined but got '${typeof allowFullscreen}' instead`
		);
	}

	if (typeof clickToPlay !== 'boolean' && typeof clickToPlay !== 'undefined') {
		throw new TypeError(
			`'clickToPlay' must be a boolean or undefined but got '${typeof clickToPlay}' instead`
		);
	}

	const setMediaVolumeAndPersist = useCallback((vol: number) => {
		setMediaVolume(vol);
		persistVolume(vol);
	}, []);

	useImperativeHandle(ref, () => rootRef.current as PlayerRef);

	const timelineContextValue = useMemo((): TimelineContextValue & {
		shouldRegisterSequences: boolean;
	} => {
		return {
			frame,
			playing,
			rootId,
			shouldRegisterSequences: false,
		};
	}, [frame, playing, rootId]);

	const setTimelineContextValue = useMemo((): SetTimelineContextValue => {
		return {
			setFrame,
			setPlaying,
		};
	}, [setFrame]);
	const mediaVolumeContextValue = useMemo((): MediaVolumeContextValue => {
		return {
			mediaMuted,
			mediaVolume,
		};
	}, [mediaMuted, mediaVolume]);

	const setMediaVolumeContextValue = useMemo((): SetMediaVolumeContextValue => {
		return {
			setMediaMuted,
			setMediaVolume: setMediaVolumeAndPersist,
		};
	}, [setMediaVolumeAndPersist]);

	const compositionManagerContext: CompositionManagerContext = useMemo(() => {
		return {
			compositions: [
				{
					component: component as React.LazyExoticComponent<
						LooseAnyComponent<unknown>
					>,
					durationInFrames,
					height: compositionHeight,
					width: compositionWidth,
					fps,
					id: 'player-comp',
					props: inputProps as unknown,
					nonce: 777,
				},
			],
			currentComposition: 'player-comp',
			registerComposition: () => undefined,
			registerSequence: () => undefined,
			sequences: [],
			setCurrentComposition: () => undefined,
			unregisterComposition: () => undefined,
			unregisterSequence: () => undefined,
			registerAsset: () => undefined,
			unregisterAsset: () => undefined,
			assets: [],
		};
	}, [
		component,
		durationInFrames,
		compositionHeight,
		compositionWidth,
		fps,
		inputProps,
	]);

	const passedInputProps = useMemo(() => {
		return inputProps ?? {};
	}, [inputProps]);

	return (
		<Internals.Timeline.TimelineContext.Provider value={timelineContextValue}>
			<Internals.Timeline.SetTimelineContext.Provider
				value={setTimelineContextValue}
			>
				<Internals.CompositionManager.Provider
					value={compositionManagerContext}
				>
					<Internals.MediaVolumeContext.Provider
						value={mediaVolumeContextValue}
					>
						<Internals.SetMediaVolumeContext.Provider
							value={setMediaVolumeContextValue}
						>
							<PlayerEventEmitterContext.Provider value={emitter}>
								<PlayerUI
									ref={rootRef}
									autoPlay={Boolean(autoPlay)}
									loop={Boolean(loop)}
									controls={Boolean(controls)}
									style={style}
									inputProps={passedInputProps}
									allowFullscreen={Boolean(allowFullscreen)}
									clickToPlay={Boolean(clickToPlay)}
									showVolumeControls={Boolean(showVolumeControls)}
									setMediaVolume={setMediaVolumeAndPersist}
									mediaVolume={mediaVolume}
									mediaMuted={mediaMuted}
									doubleClickToFullscreen={Boolean(doubleClickToFullscreen)}
									setMediaMuted={setMediaMuted}
								/>
							</PlayerEventEmitterContext.Provider>
						</Internals.SetMediaVolumeContext.Provider>
					</Internals.MediaVolumeContext.Provider>
				</Internals.CompositionManager.Provider>
			</Internals.Timeline.SetTimelineContext.Provider>
		</Internals.Timeline.TimelineContext.Provider>
	);
};

declare module 'react' {
	// eslint-disable-next-line @typescript-eslint/no-shadow
	function forwardRef<T, P = {}>(
		render: (
			props: P,
			ref: React.MutableRefObject<T>
		) => React.ReactElement | null
	): (props: P & React.RefAttributes<T>) => React.ReactElement | null;
}

export const Player = forwardRef(PlayerFn);
