from .enums import AudioSampleStatus, RecordingItemStatus, ValidatorDecision


def validator_states(decision: ValidatorDecision) -> tuple[AudioSampleStatus, RecordingItemStatus]:
    return {
        ValidatorDecision.ACCEPT: (AudioSampleStatus.ACCEPTED, RecordingItemStatus.ACCEPTED),
        ValidatorDecision.REJECT: (AudioSampleStatus.REJECTED, RecordingItemStatus.OPEN),
        ValidatorDecision.NEED_RETAKE: (AudioSampleStatus.NEED_RETAKE, RecordingItemStatus.NEED_RETAKE),
    }[decision]

