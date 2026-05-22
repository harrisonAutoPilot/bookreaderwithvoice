import React, { Component } from 'react';
import { StyleSheet, Dimensions, View} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import PulseAdmin from '../components/PulseAnim'

import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
const width = Dimensions.get('window').width;

export default class SplashScreen extends Component {

  constructor(props) {
    super(props)
  }
  

  componentDidMount (){
    setTimeout(()=>{
      const getData = async () => {
        try {
          const value = await AsyncStorage.getItem('@storage_Key')
          if(value !== null && value == 'GradeEight88') {
            // value previously stored
            this.props.navigation.navigate('HomeScreen');
          }
          else{
            this.props.navigation.navigate('Login');
          }
        } catch(e) {
          // error reading value
          this.props.navigation.navigate('Login');
        }
      }
      getData();
    }, 5000)
  }


  render() {
    return (
      <View style={{position:'absolute',width:wp('80%'), height:hp('12%'),top:hp('10%'), justifyContent:'center', alignItems:'center', zIndex:9, right:wp('40%'),}}>
        <PulseAdmin style={styles.pulse} />
      </View>
    )
  }
}
const styles = StyleSheet.create({
  pulse: {
    position:'absolute',
    width:wp('80%'),
    height:hp('12%'),
    top:hp('10%'), 
    justifyContent:'center', 
    alignItems:'center', 
    zIndex:9, 
    right:wp('40%'),
    marginRight: 200
  }
})
