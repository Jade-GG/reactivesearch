import VueTypes from 'vue-types';
import { helper } from '@appbaseio/reactivecore';
import { componentTypes } from '@appbaseio/reactivecore/lib/utils/constants';
import Container from '../../styles/Container';
import { connect } from '../../utils/index';
import ComponentWrapper from '../basic/ComponentWrapper.jsx';
import PreferencesConsumer from '../basic/PreferencesConsumer.jsx';
import types from '../../utils/vueTypes';
import { RangeConnected as RangeSlider } from './RangeSlider.jsx';
import Input from '../../styles/Input';
import Content from '../../styles/Content';
import Flex from '../../styles/Flex';

const { getClassName, isEqual } = helper;

const RangeInput = {
	name: 'RangeInput',
	components: {
		RangeSlider,
	},
	inject: {
		theme: {
			from: 'theme_reactivesearch',
		},
	},
	data() {
		const state = {
			currentValue: {
				start: this.$props.range ? this.$props.range.start : 0,
				end: this.$props.range ? this.$props.range.end : 10,
			},
			isStartValid: true,
			isEndValid: true,
		};
		return state;
	},

	props: {
		className: {
			types: types.string,
			default: '',
		},
		defaultValue: types.range,
		validateRange: types.func,
		value: types.range,
		dataField: types.stringRequired,
		innerClass: types.style,
		range: {
			types: types.range,
			default() {
				return {
					start: 0,
					end: 10,
				};
			},
		},
		rangeLabels: types.rangeLabels,
		stepValue: types.number,
		componentStyle: types.style,
		componentId: types.stringRequired,
		compoundClause: types.compoundClause,
		includeNullValues: VueTypes.bool,
		beforeValueChange: types.func,
		customQuery: types.func,
		data: types.data,
		filterLabel: types.string,
		react: types.react,
		showFilter: VueTypes.bool.def(true),
		showCheckbox: VueTypes.bool.def(true),
		title: types.title,
		URLParams: VueTypes.bool.def(false),
		sliderOptions: VueTypes.object.def({}),
		nestedField: types.string,
		endpoint: types.endpointConfig,
	},

	methods: {
		shouldUpdate(value) {
			const { validateRange } = this.$props;
			if (validateRange && value) {
				return validateRange([value.start, value.end]);
			}
			if (value) {
				return value.start <= value.end;
			}
			return false;
		},
		isControlled() {
			if (this.$props.value && this.$attrs) {
				return true;
			}
			return false;
		},
		handleChange(value, event) {
			let currentValue = value;
			if (this.shouldUpdate(value) && !isEqual(value, this.currentValue)) {
				switch (event) {
					case 'change':
						if (!value) {
							currentValue = {
								start: this.$props.range ? this.$props.range.start : 0,
								end: this.$props.range ? this.$props.range.end : 10,
							};
						}

						this.currentValue = currentValue;
						this.$emit('change', this.currentValue);
						break;
					case 'value-change':
						this.$emit('valueChange', this.currentValue);
						this.$emit('value-change', this.currentValue);
						break;
					default:
						this.currentValue = { ...currentValue };
						break;
				}
			}
		},
		handleOnChange(value) {
			this.handleChange(value || this.$props.range, 'change');
		},
		handleValueChange(value) {
			this.handleChange(value, 'value-change');
		},
		handleInputChange(e) {
			const { name, value } = e.target;
			if (Number.isNaN(value)) {
				if (name === 'start') {
					this.isStartValid = false;
				} else {
					this.isEndValid = false;
				}
			} else if (name === 'start' && !this.isStartValid) {
				this.isStartValid = true;
			} else if (name === 'end' && !this.isEndValid) {
				this.isEndValid = true;
			}

			if (this.isStartValid && this.isEndValid) {
				if (name === 'start') {
					this.handleChange(
						{
							start: Number(value),
							end: this.currentValue.end,
						},
						'change',
					);
				} else {
					this.handleChange(
						{
							start: this.currentValue.start,
							end: Number(value),
						},
						'change',
					);
				}
			}
		},
	},
	watch: {
		defaultValue(newVal, oldVal) {
			if (oldVal.start !== newVal.start || oldVal.end !== newVal.end) {
				this.handleChange(newVal);
			}
		},
		value(newVal, oldVal) {
			if (!isEqual(newVal, oldVal)) {
				if (this.isControlled()) {
					this.handleChange(newVal, 'change');
				}
			}
		},
	},
	created() {
		if (
			this.$props.defaultValue
			&& this.$props.defaultValue.start
			&& this.$props.defaultValue.end
		) {
			this.handleChange(this.$props.defaultValue);
		}
		if (this.isControlled()) {
			this.handleChange(this.$props.value, 'change');
		}
	},
	render() {
		const {
			className,
			dataField,
			range,
			rangeLabels,
			componentId,
			innerClass,
			stepValue,
			componentStyle,
			themePreset,
			includeNullValues,
			beforeValueChange,
			customQuery,
			data,
			filterLabel,
			react,
			showFilter,
			showCheckbox,
			title,
			URLParams,
			sliderOptions,
			nestedField,
		} = this.$props;
		return (
			<Container style={componentStyle} class={className}>
				<RangeSlider
					componentId={componentId}
					value={{
						start: this.currentValue.start,
						end: this.currentValue.end,
					}}
					range={range}
					dataField={dataField}
					rangeLabels={rangeLabels}
					includeNullValues={includeNullValues}
					beforeValueChange={beforeValueChange}
					customQuery={customQuery}
					data={data}
					filterLabel={filterLabel}
					react={react}
					showFilter={showFilter}
					showCheckbox={showCheckbox}
					title={title}
					URLParams={URLParams}
					sliderOptions={sliderOptions}
					nestedField={nestedField}
					on={{
						change: this.handleOnChange,
						'value-change': this.handleValueChange,
					}}
				/>
				<Flex class={getClassName(innerClass, 'input-container') || ''}>
					<Flex direction="column" flex={2}>
						<Input
							key={`${componentId}-start-value`}
							name="start"
							type="number"
							on={{
								change: this.handleInputChange,
							}}
							step={stepValue}
							themePreset={themePreset}
							aria-label={`${componentId}-start-input`}
							min={this.$props.range ? this.$props.range.start : 0}
							class={getClassName(innerClass, 'input') || ''}
							alert={!this.isStartValid}
							value={this.currentValue.start || 0}
						/>
						{!this.isStartValid && <Content alert>Input range is invalid</Content>}
					</Flex>
					<Flex justifyContent="center" alignItems="center" flex={1}>
						-
					</Flex>
					<Flex direction="column" flex={2}>
						<Input
							key={`${componentId}-end-value`}
							name="end"
							type="number"
							on={{
								change: this.handleInputChange,
							}}
							step={stepValue}
							themePreset={themePreset}
							aria-label={`${componentId}-end-input`}
							max={this.$props.range ? this.$props.range.end : 10}
							class={getClassName(innerClass, 'input') || ''}
							alert={!this.isEndValid}
							value={this.currentValue.end || 0}
						/>
						{!this.isEndValid && <Content alert>Input range is invalid</Content>}
					</Flex>
				</Flex>
			</Container>
		);
	},
};

const mapStateToProps = (state) => ({
	themePreset: state.config.themePreset,
});

export const RangeConnected = PreferencesConsumer(
	ComponentWrapper(connect(mapStateToProps, {})(RangeInput), {
		componentType: componentTypes.rangeInput,
	}),
);
RangeConnected.name = RangeInput.name;

RangeConnected.install = function (Vue) {
	Vue.component(RangeConnected.name, RangeConnected);
};

// Add componentType for SSR
RangeConnected.componentType = componentTypes.rangeInput;

export default RangeConnected;
