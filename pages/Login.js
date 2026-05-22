import React, { Component,useRef,useState, useEffect } from 'react';
import { StyleSheet, Image, Dimensions, View, Text, TextInput, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import BottomSheet from "react-native-gesture-bottom-sheet";
import ErrorResponse from "../components/ErrorResponse"
import {
  heightPercentageToDP as hp,
  widthPercentageToDP as wp,
} from 'react-native-responsive-screen';
const width = Dimensions.get('window').width;

const Login = (props) => {
  const [password, setPassword] = useState("");
  const [showRetrieve, setShowRetrieve] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const bottomSheet = useRef();


  useEffect(() => {
    bottomSheet.current.show()
  }, []);
 

 const saveData = () => {
    // const { password } = this.state;
console.log("moses", password.password);

    if (password.password === "GradeEight88") {
      props.navigation.navigate('HomeScreen');
      
      const storeData = async (value) => {
        try {
          await AsyncStorage.setItem('@storage_Key', value)
        } catch (e) {
          // saving error
        }
      }
      storeData('GradeEight88');
    }

    else {
       setShowRetrieve(true)
      //alert("Sorry Registration has been disabled by admin! Please Contact the School Admin")
    }
  }

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
    <View style={{ borderRadius: 100, backgroundColor: '#000',alignSelf:'center' }}>
      <TouchableOpacity onPress={() => bottomSheet.current.show()}>
      <Image source={require('../assets/logo.png')} style={styles.imageSize} />
      </TouchableOpacity>
    </View>

<BottomSheet  ref={bottomSheet}height={280} hasDraggableIcon={false} >
<View style={styles.imgCover}>


</View>
<View style={styles.welcomeCover}>
    <Text style={styles.smText}>Holla!</Text>
    <Text style={styles.bgText}>Enter your Admin Password</Text>
</View>

   <View style={styles.formCover}>
      <TextInput
        style={styles.input}
        placeholder='Administrative Password'
        autoCapitalize="none"
        secureTextEntry={!showPassword}
        placeholderTextColor='gray'
        onChangeText={(val) => {
          setPassword({
            password: val,
          });
        }}
        value={password}
      />
      <View style={styles.showCover}>
       {
        showPassword ?
       <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
        <Image source={require('../assets/eye.png')} style={styles.eyeImg} />
       </TouchableOpacity>
        :
       <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
        <Image source={require('../assets/hidden.png')} style={styles.eyeImg} />
       </TouchableOpacity>
       }
      </View>
      <TouchableOpacity
        style={styles.submitButton}
        onPress={saveData}>
        <Text style={styles.submitButtonText}  >SUBMIT</Text>
      </TouchableOpacity>
    </View>


 </BottomSheet>

 <ErrorResponse
        visibleRetrieve={showRetrieve}
        returnBack={() => setShowRetrieve(false)}
        title="Incorrect Credential"
        message="Sorry Registration has been disabled by admin! Please Contact the School Admin"
      />
  </View>
  );
};

const styles = StyleSheet.create({
  imageSize: {
    marginTop: hp('-35%'),
    width: 150,
    height: 150,
    alignSelf: 'center',
    resizeMode: 'contain',

  },
  formCover: {
    marginTop: 20,
    width: wp('90%'),
    height: hp('45%'),
    alignSelf:'center',
    borderRadius: 5,
    borderWidth: 0,
    borderStyle: 'solid',
    borderColor: '#e6e6e6',
    marginTop:-8,
   

  },
  input: {
    borderRadius: 5,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: '#e6e6e6',
    alignItems: 'center',
    margin: 10,
    padding: 13,
    paddingLeft:20,
  },
  elevation: {
    elevation: 20,
    shadowColor: '#52006A',
  },
  submitButtonText: {
    color: 'white'
  },
  submitButton: {
    backgroundColor: '#00b300',
    padding: 10,
    margin: 15,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 50,
  },
  imgCover:{
    width:wp('100%'),
    alignItems:'center',
    alignSelf:'center',
    paddingTop:20,
  },
  logImg:{
    width:80,
    height:80,
    resizeMode:'contain',
   
  },
  smLogImg:{
    width:30,
    height:30,
    resizeMode:'contain',
   
  },
  welcomeCover:{
    width:wp('100%'),
    padding:20,
  },
  smText:{
    fontSize: 14,
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? "Arial Hebrew" : "Urbanist-Regular",
    lineHeight: 20,
    letterSpacing: 0.2,
    fontWeight: "600",
    marginBottom:10,
    paddingLeft:12,
  },
  bgText:{
    fontSize: 22,
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? "Arial Hebrew" : "Urbanist-SemiBold",
    lineHeight: 28,
    letterSpacing: 0.2,
    fontWeight: "800",
    paddingLeft:12,
  },
  touchCover:{
    width:wp('100%'),
    alignItems:'center',
    alignSelf:'center',
    padding:20,
    paddingTop:10,
  },
  getLocCover:{
    width:wp('80%'),
    flexDirection:'row',
    justifyContent:'space-around',
    padding:12,
    borderWidth:0,
    backgroundColor:'#fff',
    borderColor:"#212121",
    borderStyle:'solid',
    alignSelf:'center',
    marginBottom:10,
    borderRadius:30,
    elevation:4,
    shadowRadius: 5,
  },
  touchText:{
    fontSize: 14,
    color: '#212121',
    fontFamily: Platform.OS === 'ios' ? "Arial Hebrew" : "Urbanist-Regular",
    lineHeight: 20,
    letterSpacing: 0.2,
    fontWeight: "500", 
    paddingVertical:5, 
  },
  showCover:{
   position:'absolute',
   right:wp('8%'),
   marginTop:28,
  },
  eyeImg:{
    width:20,
    height:20,
    resizeMode:"contain"
  }
});

export default Login;